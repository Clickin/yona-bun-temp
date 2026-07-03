import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type {
  ProjectContainer,
  ProjectMilestone,
  ProjectMilestoneIssue,
  YonaLabel,
} from "../../../api/types";
import { listProjectMilestones } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type MilestoneListSearch = {
  orderBy: string;
  orderDir: string;
  state: string;
};

export const Route = createFileRoute("/$ownerName/$projectName/milestones")({
  component: ProjectMilestonesRoute,
  validateSearch(search: Record<string, unknown>): MilestoneListSearch {
    return {
      orderBy: stringSearch(search.orderBy, "dueDate"),
      orderDir: stringSearch(search.orderDir, "asc"),
      state: stringSearch(search.state, "open"),
    };
  },
});

function ProjectMilestonesRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectMilestonesScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectMilestonesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const milestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: search.orderBy,
        orderDir: search.orderDir,
        state: search.state,
      }),
    queryKey: [
      "project",
      ownerName,
      projectName,
      "milestones",
      search.state,
      search.orderBy,
      search.orderDir,
    ],
  });

  if (!projectQuery.data || !milestonesQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="milestone"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
      <link
        rel="stylesheet"
        href={prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/issue/labels.css`,
        )}
        type="text/css"
      />
      <ProjectMilestonesBody
        milestones={milestonesQuery.data.milestones}
        project={projectQuery.data}
        search={search}
      />
    </>
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

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="tab-wrap">
          {booleanField(project.viewerCanUpdate) ? (
            <div className="pull-right btns">
              <Link
                to="/$ownerName/$projectName/newMilestoneForm"
                params={{ ownerName, projectName }}
                className="ybtn ybtn-success"
              >
                {t("milestone.menu.new")}
              </Link>
            </div>
          ) : null}

          <ul className="nav nav-tabs">
            {["open", "closed", "all"].map((state) => (
              <li key={state} className={search.state === state ? "active" : ""}>
                <Link
                  to="/$ownerName/$projectName/milestones"
                  params={{ ownerName, projectName }}
                  search={{ state }}
                >
                  {t(`milestone.state.${state}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {milestones.length === 0 ? (
          <div className="error-wrap">
            <i className="ico ico-err1"></i>
            <p>{t("milestone.is.empty")}</p>
          </div>
        ) : (
          <>
            <div className="filter-wrap milestone">
              {milestones.length > 1 ? (
                <>
                  <div className="filters">
                    <SortLink
                      fieldName="dueDate"
                      fieldText={t("common.order.dueDate")}
                      ownerName={ownerName}
                      projectName={projectName}
                      search={search}
                    />
                    <SortLink
                      fieldName="completionRate"
                      fieldText={t("common.order.completionRate")}
                      ownerName={ownerName}
                      projectName={projectName}
                      search={search}
                    />
                  </div>
                  <div className="pull-left search search-bar">
                    <input
                      name="filter"
                      className="textbox"
                      type="text"
                      placeholder={t("search.title")}
                      value={filter}
                      onChange={(event) => {
                        setFilter(event.currentTarget.value);
                      }}
                    />
                    <button type="submit" className="search-btn">
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="row-fluid">
              <div>
                <ul className="milestones">
                  {milestones.map((milestone) => (
                    <MilestoneRow
                      key={stringField(milestone.id)}
                      filter={filter}
                      milestone={milestone}
                      ownerName={ownerName}
                      projectName={projectName}
                      search={search}
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
  const isActive = search.orderBy === fieldName;
  const orderDir = isActive && search.orderDir === "desc" ? "asc" : isActive ? "desc" : "asc";

  return (
    <Link
      to="/$ownerName/$projectName/milestones"
      params={{ ownerName, projectName }}
      search={{ orderBy: fieldName, orderDir, state: search.state }}
      className={isActive ? "filter active" : "filter"}
    >
      <i
        className={
          isActive
            ? search.orderDir === "desc"
              ? "ico btn-gray-arrow  down "
              : "ico btn-gray-arrow "
            : "ico btn-gray-arrow"
        }
      ></i>
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
  const openCount = numberField(milestone.openIssueCount);
  const closedCount = numberField(milestone.closedIssueCount);
  const totalCount = openCount + closedCount;
  const completionPercent = numberField(milestone.completionPercent);
  const isClosed = stringField(milestone.state) === "closed";
  const dueDateLabel = stringField(milestone.dueDateLabel);

  return (
    <li className="milestone">
      <div className="infos">
        <div className="meta-info">
          <strong className="version"></strong>
          <Link
            to="/$ownerName/$projectName/milestone/$milestoneId"
            params={{ ownerName, projectName, milestoneId: stringField(milestone.id) }}
            className="milestone-name"
          >
            {stringField(milestone.title)}
          </Link>
          <span className="sp">|</span>
          <span className="issue-item">{`${closedCount} / ${totalCount}`}</span>
          {search.state === "all" ? (
            <>
              <span className="sp">|</span>
              <span className={isClosed ? "state nm closed" : "state nm open"}>
                {t(`milestone.state.${isClosed ? "closed" : "open"}`)}
              </span>
            </>
          ) : null}
          {dueDateLabel ? (
            <>
              <span className="sp">|</span>
              <span
                className={
                  isClosed
                    ? "due-date ml5"
                    : booleanField(milestone.dueDateOverdue)
                      ? "due-date over"
                      : "due-date "
                }
              >
                {t("label.dueDate")}
                <strong>{dueDateLabel}</strong>
                {isClosed ? null : (
                  <span className="date">({stringField(milestone.untilLabel)})</span>
                )}
              </span>
            </>
          ) : null}
          <div className="pull-right">
            <span className="number completion-rate">
              {totalCount > 0 ? `${completionPercent} %` : ""}
            </span>
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress progress-success">
            <div className="bar" style={{ width: `${completionPercent}%` }}></div>
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
  const style = hidden ? { display: "none" } : undefined;
  const issueNumber = stringField(issue.issueNumber);
  const issueTitle = stringField(issue.title);
  const assigneeLabel = stringField(issue.assigneeLabel);
  const titleText = assigneeLabel ? `${issueTitle} - ${assigneeLabel}` : issueTitle;

  return (
    <Link
      className="issue-link"
      to="/$ownerName/$projectName/issue/$issueNumber"
      params={{ ownerName, projectName, issueNumber }}
      target="_blank"
      style={style}
    >
      <div className="issue-item" style={style}>
        <span className={`state-label ${state}`}>
          {state === "closed" ? <i className=" yobicon-checkmark"></i> : null}
        </span>
        <span className="item-name">
          <span className="number">#{issueNumber}</span>
          {titleText}
          {sortLabels(issue.labels).map((label) => (
            <span
              key={stringField(label.id)}
              className="label issue-label list-label active"
              data-category-id={stringField(label.categoryId)}
              data-label-id={stringField(label.id)}
              style={{ background: cssBackgroundColor(stringField(label.color)) }}
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
  return [
    stringField(issue.issueNumber),
    stringField(issue.title),
    stringField(issue.assigneeLabel),
    ...issue.labels.map((label) => stringField(label.name)),
  ]
    .join(" ")
    .toLowerCase();
}

function sortLabels(labels: YonaLabel[]) {
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

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function stringSearch(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
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
