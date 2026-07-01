import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
      <ProjectMilestonesBody
        milestones={milestonesQuery.data.milestones}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </>
  );
}

function ProjectMilestonesBody({
  milestones,
  project,
  runtimeConfig,
  search,
}: {
  milestones: ProjectMilestone[];
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
  search: MilestoneListSearch;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const [filter, setFilter] = useState("");
  const projectPath = `/${ownerName}/${projectName}`;
  const milestonesPath = `${projectPath}/milestones`;

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="tab-wrap">
          {booleanField(project.viewerCanUpdate) ? (
            <div className="pull-right btns">
              <a
                href={prefixBasePath(runtimeConfig.basePath, `${projectPath}/newMilestoneForm`)}
                className="ybtn ybtn-success"
              >
                {t("milestone.menu.new")}
              </a>
            </div>
          ) : null}

          <ul className="nav nav-tabs">
            {["open", "closed", "all"].map((state) => (
              <li key={state} className={search.state === state ? "active" : ""}>
                <a
                  href={prefixBasePath(runtimeConfig.basePath, `${milestonesPath}?state=${state}`)}
                >
                  {t(`milestone.state.${state}`)}
                </a>
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
                      basePath={runtimeConfig.basePath}
                      fieldName="dueDate"
                      fieldText={t("common.order.dueDate")}
                      milestonesPath={milestonesPath}
                      search={search}
                    />
                    <SortLink
                      basePath={runtimeConfig.basePath}
                      fieldName="completionRate"
                      fieldText={t("common.order.completionRate")}
                      milestonesPath={milestonesPath}
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
                      projectPath={projectPath}
                      runtimeConfig={runtimeConfig}
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
  basePath,
  fieldName,
  fieldText,
  milestonesPath,
  search,
}: {
  basePath: string;
  fieldName: string;
  fieldText: string;
  milestonesPath: string;
  search: MilestoneListSearch;
}) {
  const isActive = search.orderBy === fieldName;
  const orderDir = isActive && search.orderDir === "desc" ? "asc" : isActive ? "desc" : "asc";
  const href = prefixBasePath(
    basePath,
    `${milestonesPath}?orderBy=${fieldName}&orderDir=${orderDir}&state=${search.state}`,
  );

  return (
    <a href={href} className={isActive ? "filter active" : "filter"}>
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
    </a>
  );
}

function MilestoneRow({
  filter,
  milestone,
  projectPath,
  runtimeConfig,
  search,
}: {
  filter: string;
  milestone: ProjectMilestone;
  projectPath: string;
  runtimeConfig: RuntimeConfig;
  search: MilestoneListSearch;
}) {
  const { t } = useLegacyMessages();
  const openCount = numberField(milestone.openIssueCount);
  const closedCount = numberField(milestone.closedIssueCount);
  const totalCount = openCount + closedCount;
  const completionPercent = numberField(milestone.completionPercent);
  const isClosed = stringField(milestone.state) === "closed";
  const dueDateLabel = stringField(milestone.dueDateLabel);
  const milestoneHref = prefixBasePath(
    runtimeConfig.basePath,
    `${projectPath}/milestone/${stringField(milestone.id)}`,
  );

  return (
    <li className="milestone">
      <div className="infos">
        <div className="meta-info">
          <strong className="version"></strong>
          <a href={milestoneHref} className="milestone-name">
            {stringField(milestone.title)}
          </a>
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
        <div
          dangerouslySetInnerHTML={{
            __html: milestone.openIssues
              .map((issue) =>
                legacyIssueLinkHtml({
                  filter,
                  href: prefixBasePath(
                    runtimeConfig.basePath,
                    `${projectPath}/issue/${stringField(issue.issueNumber)}`,
                  ),
                  issue,
                  state: "open",
                }),
              )
              .join(""),
          }}
        ></div>
        <div></div>
        <div
          dangerouslySetInnerHTML={{
            __html: milestone.closedIssues
              .map((issue) =>
                legacyIssueLinkHtml({
                  filter,
                  href: prefixBasePath(
                    runtimeConfig.basePath,
                    `${projectPath}/issue/${stringField(issue.issueNumber)}`,
                  ),
                  issue,
                  state: "closed",
                }),
              )
              .join(""),
          }}
        ></div>
      </div>
    </li>
  );
}

function legacyIssueLinkHtml({
  filter,
  href,
  issue,
  state,
}: {
  filter: string;
  href: string;
  issue: ProjectMilestoneIssue;
  state: "closed" | "open";
}) {
  const normalizedFilter = filter.toLowerCase().trim();
  const hidden = normalizedFilter.length > 0 && !issueSearchText(issue).includes(normalizedFilter);
  const style = hidden ? ' style="display: none;"' : "";
  const closedIcon = state === "closed" ? '<i class=" yobicon-checkmark"></i>' : "";
  const assignee = stringField(issue.assigneeLabel)
    ? ` - ${escapeHtml(stringField(issue.assigneeLabel))}`
    : "";
  const labels = sortLabels(issue.labels)
    .map((label) => {
      return `<a href="#" class="label issue-label list-label active" data-category-id="${escapeHtml(
        stringField(label.categoryId),
      )}" data-label-id="${escapeHtml(stringField(label.id))}" style="background: ${escapeHtml(
        cssBackgroundColor(stringField(label.color)),
      )};">${escapeHtml(stringField(label.name))}</a>`;
    })
    .join("");

  return `<a class="issue-link" href="${escapeHtml(href)}" target="_blank"${style}>
                                    <div class="issue-item"${style}>
                                        <span class="state-label ${state}">
                                            ${closedIcon}
                                        </span>
                                        <span class="item-name">
                                            <span class="number">#${escapeHtml(
                                              stringField(issue.issueNumber),
                                            )}</span>
                                            ${escapeHtml(stringField(issue.title))}
                                            ${assignee}
                                            ${labels}
                                        </span>
                                    </div>
                                </a>`;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
