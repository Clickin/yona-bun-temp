import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type {
  ProjectContainer,
  ProjectMilestone,
  ProjectMilestoneIssue,
  YoramLabel,
} from "../../../api/types";
import { listProjectMilestones } from "../../../auth-workspace-client";
import { useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";
import { styles } from "./-milestones.stylex";

const sx = {
  page: stylex.props(styles.page),
  tabWrap: stylex.props(styles.tabWrap),
  tabs: stylex.props(styles.tabs),
  tab: stylex.props(styles.tab),
  tabLink: stylex.props(styles.tabLink),
  activeTabLink: stylex.props(styles.tabLink, styles.activeTabLink),
  newButton: stylex.props(styles.newButton),
  filterWrap: stylex.props(styles.filterWrap),
  filters: stylex.props(styles.filters),
  filterLink: stylex.props(styles.filterLink),
  filterActive: stylex.props(styles.filterActive),
  search: stylex.props(styles.search),
  searchInput: stylex.props(styles.searchInput),
  searchButton: stylex.props(styles.searchButton),
  icon: stylex.props(styles.icon),
  list: stylex.props(styles.list),
  row: stylex.props(styles.row),
  meta: stylex.props(styles.meta),
  name: stylex.props(styles.name),
  separator: stylex.props(styles.separator),
  issue: stylex.props(styles.issue),
  due: stylex.props(styles.due),
  dueOver: stylex.props(styles.due, styles.dueOver),
  completion: stylex.props(styles.completion),
  progressWrap: stylex.props(styles.progressWrap),
  progress: stylex.props(styles.progress),
  progressBar: stylex.props(styles.progressBar),
  issueLink: stylex.props(styles.issueLink),
  issueItem: stylex.props(styles.issueItem),
  itemName: stylex.props(styles.itemName),
  issueNumber: stylex.props(styles.issueNumber),
  issueStateOpen: stylex.props(styles.issueStateOpen),
  issueStateClosed: stylex.props(styles.issueStateClosed),
  label: stylex.props(styles.label),
} as const;

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
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy,
        orderDir,
        state,
      }),
    queryKey: ["project", ownerName, projectName, "milestones", state, orderBy, orderDir],
  });

  if (!projectQuery.data || !milestonesQuery.data) {
    return null;
  }

  return (
    <ProjectMilestonesBody
      milestones={milestonesQuery.data.milestones}
      project={projectQuery.data}
      search={search}
    />
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

  return (
    <div {...sx.page} data-stylex-owner="project-milestones-page">
      <div data-stylex-owner="project-milestones-shell">
        <div {...sx.tabWrap} data-stylex-owner="project-milestones-tab-wrap">
          {booleanField(project.viewerCanUpdate) ? (
            <div data-stylex-owner="project-milestones-new-wrap">
              <Link
                {...LEGACY_MILESTONE_LIST_LINK_PROPS}
                to="/$ownerName/$projectName/newMilestoneForm"
                params={{ ownerName, projectName }}
                {...sx.newButton}
                data-stylex-owner="project-milestones-new"
              >
                {t("milestone.menu.new")}
              </Link>
            </div>
          ) : null}

          <ul {...sx.tabs} data-stylex-owner="project-milestones-tabs">
            {["open", "closed", "all"].map((state) => (
              <li {...sx.tab} data-stylex-owner="project-milestones-tab" key={state}>
                <Link
                  {...LEGACY_MILESTONE_LIST_LINK_PROPS}
                  to="/$ownerName/$projectName/milestones"
                  params={{ ownerName, projectName }}
                  {...(currentState === state ? sx.activeTabLink : sx.tabLink)}
                  data-stylex-owner="project-milestones-tab-link"
                  search={{ state }}
                >
                  {t(`milestone.state.${state}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {milestones.length === 0 ? (
          <div data-stylex-owner="project-milestones-empty">
            <i className="ico ico-err1"></i>
            <p>{t("milestone.is.empty")}</p>
          </div>
        ) : (
          <>
            <div {...sx.filterWrap} data-stylex-owner="project-milestones-filter-wrap">
              {milestones.length > 1 ? (
                <>
                  <div {...sx.filters} data-stylex-owner="project-milestones-filters">
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
                  <div {...sx.search} data-stylex-owner="project-milestones-search">
                    <input
                      name="filter"
                      {...sx.searchInput}
                      data-stylex-owner="project-milestones-search-input"
                      type="text"
                      placeholder={t("search.title")}
                      value={filter}
                      onChange={(event) => {
                        setFilter(event.currentTarget.value);
                      }}
                    />
                    <button
                      {...sx.searchButton}
                      data-stylex-owner="project-milestones-search-button"
                      type="submit"
                    >
                      <i {...sx.icon} className="yobicon-search"></i>
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div data-stylex-owner="project-milestones-row-fluid">
              <div>
                <ul {...sx.list} data-stylex-owner="project-milestones-list">
                  {milestones.map((milestone) => (
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
      {...(isActive ? { ...sx.filterLink, ...sx.filterActive } : sx.filterLink)}
      data-stylex-owner="project-milestones-sort-link"
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
  const openCount = numberField(milestone.openIssueCount);
  const closedCount = numberField(milestone.closedIssueCount);
  const totalCount = openCount + closedCount;
  const completionPercent = numberField(milestone.completionPercent);
  const isClosed = stringField(milestone.state) === "closed";
  const dueDateLabel = stringField(milestone.dueDateLabel);

  return (
    <li {...sx.row} data-stylex-owner="project-milestones-item">
      <div data-stylex-owner="project-milestones-infos">
        <div {...sx.meta} data-stylex-owner="project-milestones-meta">
          <strong className="version"></strong>
          <Link
            {...LEGACY_MILESTONE_LIST_LINK_PROPS}
            to="/$ownerName/$projectName/milestone/$milestoneId"
            params={{ ownerName, projectName, milestoneId: stringField(milestone.id) }}
            search={{}}
            {...sx.name}
            data-stylex-owner="project-milestones-name"
          >
            {stringField(milestone.title)}
          </Link>
          <span {...sx.separator} data-stylex-owner="project-milestones-separator">
            |
          </span>
          <span
            {...sx.issue}
            data-stylex-owner="project-milestones-issue-count"
          >{`${closedCount} / ${totalCount}`}</span>
          {search.state === "all" ? (
            <>
              <span {...sx.separator} data-stylex-owner="project-milestones-separator">
                |
              </span>
              <span style={{ color: isClosed ? "#51aacc" : "#5dbbe0" }}>
                {t(`milestone.state.${isClosed ? "closed" : "open"}`)}
              </span>
            </>
          ) : null}
          {dueDateLabel ? (
            <>
              <span {...sx.separator} data-stylex-owner="project-milestones-separator">
                |
              </span>
              <span {...(booleanField(milestone.dueDateOverdue) ? sx.dueOver : sx.due)}>
                {t("label.dueDate")}
                <strong>{dueDateLabel}</strong>
                {isClosed ? null : (
                  <span data-stylex-owner="project-milestones-until">
                    ({stringField(milestone.untilLabel)})
                  </span>
                )}
              </span>
            </>
          ) : null}
          <div {...sx.completion}>
            <span data-stylex-owner="project-milestones-completion">
              {totalCount > 0 ? `${completionPercent} %` : ""}
            </span>
          </div>
        </div>

        <div {...sx.progressWrap}>
          <div {...sx.progress}>
            <div {...sx.progressBar} style={{ width: `${completionPercent}%` }}></div>
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
      {...LEGACY_MILESTONE_LIST_LINK_PROPS}
      {...sx.issueLink}
      data-stylex-owner="project-milestones-issue-link"
      to="/$ownerName/$projectName/issue/$issueNumber"
      params={{ ownerName, projectName, issueNumber }}
      target="_blank"
      style={style}
    >
      <div {...sx.issueItem}>
        <span {...(state === "closed" ? sx.issueStateClosed : sx.issueStateOpen)}>
          {state === "closed" ? <i className="yobicon-checkmark"></i> : null}
        </span>
        <span {...sx.itemName} data-stylex-owner="project-milestones-issue-name">
          <span {...sx.issueNumber} data-stylex-owner="project-milestones-issue-number">
            #{issueNumber}
          </span>
          {titleText}
          {sortLabels(issue.labels).map((label) => (
            <span
              key={stringField(label.id)}
              {...sx.label}
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
