import { useState } from "react";
import type { CSSProperties } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type {
  ProjectContainer,
  ProjectMilestone,
  ProjectMilestoneIssue,
  YoramLabel,
} from "../../../api/types";
import { listProjectMilestones } from "../../../auth-workspace-client";
import legacySpriteUrl from "../../../assets/legacy/sprite.png";
import { useLockedLinkClick } from "../../../components/route-fetch-lock";
import { useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";

type MilestoneListSearch = {
  orderBy?: string;
  orderDir?: string;
  state?: string;
};

const LEGACY_MILESTONE_LIST_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

export const Route = createFileRoute("/$ownerName/$projectName/milestones")({
  component: ProjectMilestonesRoute,
  validateSearch(search: Record<string, unknown>): MilestoneListSearch {
    return {
      orderBy: optionalStringSearch(search.orderBy),
      orderDir: optionalStringSearch(search.orderDir),
      state: optionalStringSearch(search.state),
    };
  },
});

function ProjectMilestonesRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectMilestonesScreen runtimeConfig={runtimeConfig} />;
}

function ProjectMilestonesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const state = search.state ?? "open";
  const orderBy = search.orderBy ?? "dueDate";
  const orderDir = search.orderDir ?? "asc";
  const milestonesQuery = useQuery({
    placeholderData: keepPreviousData,
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy,
        orderDir,
        state,
      }),
    queryKey: ["project", ownerName, projectName, "milestones", state, orderBy, orderDir],
  });

  if (!projectQuery.data || !milestonesQuery.data) {
    return <ProjectMilestonesLoading />;
  }

  return (
    <ProjectMilestonesBody
      milestones={milestonesQuery.data.milestones}
      project={projectQuery.data}
      search={search}
    />
  );
}

function ProjectMilestonesLoading() {
  return (
    <div className="page-wrap-outer" data-owner="project-milestones-page" aria-busy="true">
      <div className="project-page-wrap" data-owner="project-milestones-shell">
        <div className="tab-wrap" data-owner="project-milestones-loading-tabs" />
      </div>
    </div>
  );
}

function ProjectMilestonesBody({
  milestones,
  project,
  search,
}: {
  milestones: ProjectMilestone[];
  project: ProjectContainer;
  search: MilestoneListSearch;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const [filter, setFilter] = useState("");
  const currentState = search.state ?? "open";
  const emptyIconStyle = {
    backgroundImage: `url(${legacySpriteUrl})`,
    backgroundPosition: "-5px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "82px",
    verticalAlign: "middle",
    width: "62px",
  };

  return (
    <div className="page-wrap-outer" data-owner="project-milestones-page" data-content-ready="true">
      <div className="project-page-wrap" data-owner="project-milestones-shell">
        <div className="tab-wrap" data-owner="project-milestones-tab-wrap">
          {booleanField(project.viewerCanUpdate) ? (
            <div className="btns" data-owner="project-milestones-new-wrap">
              <Link
                {...LEGACY_MILESTONE_LIST_LINK_PROPS}
                to="/$ownerName/$projectName/newMilestoneForm"
                params={{ ownerName, projectName }}
                className="ybtn ybtn-success"
                data-owner="project-milestones-new"
              >
                {t("milestone.menu.new")}
              </Link>
            </div>
          ) : null}

          <ul className="nav nav-tabs" data-owner="project-milestones-tabs">
            {["open", "closed", "all"].map((state) => (
              <li
                className={`${currentState === state ? " active" : ""}`}
                data-owner="project-milestones-tab"
                key={state}
              >
                <Link
                  {...LEGACY_MILESTONE_LIST_LINK_PROPS}
                  to="/$ownerName/$projectName/milestones"
                  params={{ ownerName, projectName }}
                  data-owner="project-milestones-tab-link"
                  search={{ state }}
                >
                  {t(`milestone.state.${state}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {milestones.length === 0 ? (
          <div className="error-wrap" data-owner="project-milestones-empty">
            <i
              className="ico ico-err1"
              style={emptyIconStyle}
              data-owner="project-milestones-empty-icon"
            ></i>
            <p className="" data-owner="project-milestones-empty-message">
              {t("milestone.is.empty")}
            </p>
          </div>
        ) : (
          <>
            <div className="filter-wrap milestone" data-owner="project-milestones-filter-wrap">
              {milestones.length > 1 ? (
                <>
                  <div className="filters" data-owner="project-milestones-filters">
                    <SortLink
                      fieldName="dueDate"
                      fieldText={t("common.order.dueDate")}
                      ownerName={ownerName}
                      projectName={projectName}
                      search={{ ...search, state: currentState }}
                    />
                    <SortLink
                      fieldName="completionRate"
                      fieldText={t("common.order.completionRate")}
                      ownerName={ownerName}
                      projectName={projectName}
                      search={{ ...search, state: currentState }}
                    />
                  </div>
                  <div className="search search-bar" data-owner="project-milestones-search">
                    <input
                      name="filter"
                      className="textbox"
                      data-owner="project-milestones-search-input"
                      type="text"
                      placeholder={t("search.title")}
                      value={filter}
                      onChange={(event) => {
                        setFilter(event.currentTarget.value);
                      }}
                    />
                    <button
                      className="search-btn"
                      data-owner="project-milestones-search-button"
                      type="submit"
                    >
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="row-fluid" data-owner="project-milestones-row-fluid">
              <div>
                <ul className="milestones" data-owner="project-milestones-list">
                  {milestones.map((milestone, index) => (
                    <MilestoneRow
                      key={stringField(milestone.id)}
                      filter={filter}
                      milestone={milestone}
                      ownerName={ownerName}
                      projectName={projectName}
                      search={{ ...search, state: currentState }}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SortLink({
  fieldName,
  fieldText,
  ownerName,
  projectName,
  search,
}: {
  fieldName: string;
  fieldText: string;
  ownerName: string;
  projectName: string;
  search: MilestoneListSearch;
}) {
  const searchOrderBy = search.orderBy ?? "dueDate";
  const isActive = searchOrderBy === fieldName;
  const searchOrderDir = search.orderDir ?? "asc";
  const orderDir = isActive && searchOrderDir === "desc" ? "asc" : isActive ? "desc" : "asc";

  return (
    <Link
      {...LEGACY_MILESTONE_LIST_LINK_PROPS}
      to="/$ownerName/$projectName/milestones"
      params={{ ownerName, projectName }}
      search={{ orderBy: fieldName, orderDir, state: search.state }}
      className={`filter${isActive ? " active" : ""}`}
      data-owner="project-milestones-sort-link"
    >
      <i className="ico btn-gray-arrow"></i>
      {fieldText}
    </Link>
  );
}

function MilestoneRow({
  filter,
  milestone,
  ownerName,
  projectName,
  search,
}: {
  filter: string;
  milestone: ProjectMilestone;
  ownerName: string;
  projectName: string;
  search: MilestoneListSearch;
}) {
  const { t } = useLegacyMessages();
  const lockedLinkClick = useLockedLinkClick();
  const openCount = numberField(milestone.openIssueCount);
  const closedCount = numberField(milestone.closedIssueCount);
  const totalCount = openCount + closedCount;
  const completionPercent = numberField(milestone.completionPercent);
  const isClosed = stringField(milestone.state) === "closed";
  const dueDateLabel = stringField(milestone.dueDateLabel);

  return (
    <li className="milestone" data-owner="project-milestones-item">
      <div className="infos" data-owner="project-milestones-infos">
        <div className="meta-info" data-owner="project-milestones-meta">
          <strong className="version"></strong>
          <Link
            {...LEGACY_MILESTONE_LIST_LINK_PROPS}
            onClick={lockedLinkClick}
            to="/$ownerName/$projectName/milestone/$milestoneId"
            params={{ ownerName, projectName, milestoneId: stringField(milestone.id) }}
            search={{}}
            className="milestone-name"
            data-owner="project-milestones-name"
          >
            {stringField(milestone.title)}
          </Link>
          <span className="sp" data-owner="project-milestones-separator">
            |
          </span>
          <span
            data-owner="project-milestones-issue-count"
            className="issue-item"
          >{`${closedCount} / ${totalCount}`}</span>
          {search.state === "all" ? (
            <>
              <span className="sp" data-owner="project-milestones-separator">
                |
              </span>
              <span className={`state nm ${isClosed ? "closed" : "open"}`}>
                {t(`milestone.state.${isClosed ? "closed" : "open"}`)}
              </span>
            </>
          ) : null}
          {dueDateLabel ? (
            <>
              <span className="sp" data-owner="project-milestones-separator">
                |
              </span>
              <span
                className={
                  isClosed
                    ? "due-date ml5"
                    : booleanField(milestone.dueDateOverdue)
                      ? "due-date over"
                      : "due-date"
                }
              >
                {t("label.dueDate")}
                <strong>{dueDateLabel}</strong>
                {isClosed ? null : (
                  <span className="date" data-owner="project-milestones-until">
                    ({stringField(milestone.untilLabel)})
                  </span>
                )}
              </span>
            </>
          ) : null}
          <div className="pull-right">
            <span className="number completion-rate" data-owner="project-milestones-completion">
              {totalCount > 0 ? `${completionPercent} %` : ""}
            </span>
          </div>
        </div>

        <div className="progress-wrap" data-owner="project-milestones-progress-wrap">
          <div className="progress progress-success" data-owner="project-milestones-progress">
            <div
              className="bar"
              style={{ width: `${completionPercent}%` }}
              data-owner="project-milestones-progress-bar"
            ></div>
          </div>
        </div>
      </div>
      <div>
        <div></div>
        <div>
          {milestone.openIssues.map((issue) => (
            <MilestoneIssueLink
              key={`open-${stringField(issue.issueNumber)}`}
              filter={filter}
              issue={issue}
              ownerName={ownerName}
              projectName={projectName}
              state="open"
            />
          ))}
        </div>
        <div></div>
        <div>
          {milestone.closedIssues.map((issue) => (
            <MilestoneIssueLink
              key={`closed-${stringField(issue.issueNumber)}`}
              filter={filter}
              issue={issue}
              ownerName={ownerName}
              projectName={projectName}
              state="closed"
            />
          ))}
        </div>
      </div>
    </li>
  );
}

function MilestoneIssueLink({
  filter,
  issue,
  ownerName,
  projectName,
  state,
}: {
  filter: string;
  issue: ProjectMilestoneIssue;
  ownerName: string;
  projectName: string;
  state: "closed" | "open";
}) {
  const normalizedFilter = filter.toLowerCase().trim();
  const hidden = normalizedFilter.length > 0 && !issueSearchText(issue).includes(normalizedFilter);
  const issueNumber = stringField(issue.issueNumber);
  const issueTitle = stringField(issue.title);
  const assigneeLabel = stringField(issue.assigneeLabel);
  const titleText = assigneeLabel ? `${issueTitle} - ${assigneeLabel}` : issueTitle;

  return (
    <Link
      {...LEGACY_MILESTONE_LIST_LINK_PROPS}
      className="issue-link"
      data-owner={hidden ? "project-milestones-hidden-issue-link" : "project-milestones-issue-link"}
      to="/$ownerName/$projectName/issue/$issueNumber"
      params={{ ownerName, projectName, issueNumber }}
      target="_blank"
      style={hidden ? { display: "none" } : undefined}
    >
      <div className="issue-item">
        <span className={`state-label ${state}`}>
          {state === "closed" ? <i className="yobicon-checkmark"></i> : null}
        </span>
        <span className="item-name" data-owner="project-milestones-issue-name">
          <span className="number" data-owner="project-milestones-issue-number">
            #{issueNumber}
          </span>
          {titleText}
          {sortLabels(issue.labels).map((label) => (
            <span
              key={stringField(label.id)}
              className="label issue-label list-label active"
              style={
                {
                  "--x-backgroundColor": cssBackgroundColor(stringField(label.color)),
                } as CSSProperties
              }
              data-label-id={stringField(label.id)}
              data-category-id={stringField(label.categoryId)}
            >
              {stringField(label.name)}
            </span>
          ))}
        </span>
      </div>
    </Link>
  );
}

function issueSearchText(issue: ProjectMilestoneIssue) {
  const issueNumber = stringField(issue.issueNumber);
  const title = stringField(issue.title);
  const assignee = stringField(issue.assigneeLabel);
  const titleText = assignee ? `${title} - ${assignee}` : title;
  const renderedText = `#${issueNumber}${titleText}${issue.labels
    .map((label) => stringField(label.name))
    .join("")}`;
  return renderedText.toLowerCase();
}

function sortLabels(labels: YoramLabel[]) {
  return labels.slice().sort((left, right) => {
    const leftKey = `${stringField(left.categoryName)}\u0000${stringField(left.name)}`;
    const rightKey = `${stringField(right.categoryName)}\u0000${stringField(right.name)}`;
    return leftKey.localeCompare(rightKey);
  });
}

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function numberField(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function optionalStringSearch(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function cssBackgroundColor(value: string) {
  const match = /^#([0-9a-f]{6})$/iu.exec(value.trim());
  if (!match) {
    return value;
  }
  const hex = match[1];
  return `rgb(${Number.parseInt(hex.slice(0, 2), 16)}, ${Number.parseInt(
    hex.slice(2, 4),
    16,
  )}, ${Number.parseInt(hex.slice(4, 6), 16)})`;
}
