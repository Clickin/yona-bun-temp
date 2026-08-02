import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
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
import { IssueLabel } from "../../../components/issue-label";
import { useLockedLinkClick } from "../../../components/route-fetch-lock";
import { useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";
import { styles } from "./-milestones.stylex";

const milestoneListStyles = stylex.create({
  closedDueDate: { marginLeft: "5px" },
  hiddenIssueLink: { display: "none" },
});

const sx = {
  errorWrap: stylex.props(styles.errorWrap),
  errorIcon: (spriteUrl: string) => stylex.props(styles.errorIcon(spriteUrl)),
  errorMessage: stylex.props(styles.errorMessage),
  page: stylex.props(styles.page),
  tabWrap: stylex.props(styles.tabWrap),
  tabs: stylex.props(styles.tabs),
  tab: stylex.props(styles.tab),
  tabLink: stylex.props(styles.tabLink),
  activeTabLink: stylex.props(styles.tabLink, styles.activeTabLink),
  newWrap: stylex.props(styles.newWrap),
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
  rowLast: stylex.props(styles.row, styles.rowLast),
  infos: stylex.props(styles.infos),
  meta: stylex.props(styles.meta),
  name: stylex.props(styles.name),
  separator: stylex.props(styles.separator),
  issue: stylex.props(styles.issue),
  due: stylex.props(styles.due),
  dueOver: stylex.props(styles.due, styles.dueOver),
  dueClosed: stylex.props(styles.due, milestoneListStyles.closedDueDate),
  completion: stylex.props(styles.completion),
  completionNumber: stylex.props(styles.completionNumber),
  progressWrap: stylex.props(styles.progressWrap),
  progress: stylex.props(styles.progress),
  progressBar: (width: string) => stylex.props(styles.progressBar(width)),
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
    <div
      className={`${sx.page.className} page-wrap-outer`}
      data-stylex-owner="project-milestones-page"
      aria-busy="true"
    >
      <div className="project-page-wrap" data-stylex-owner="project-milestones-shell">
        <div className="tab-wrap" data-stylex-owner="project-milestones-loading-tabs" />
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
  const emptyIcon = sx.errorIcon(legacySpriteUrl);

  return (
    <div
      {...sx.page}
      className={`${sx.page.className} page-wrap-outer`}
      data-stylex-owner="project-milestones-page"
      data-stylex-content-ready="true"
    >
      <div className="project-page-wrap" data-stylex-owner="project-milestones-shell">
        <div
          {...sx.tabWrap}
          className={`${sx.tabWrap.className} tab-wrap`}
          data-stylex-owner="project-milestones-tab-wrap"
        >
          {booleanField(project.viewerCanUpdate) ? (
            <div
              {...sx.newWrap}
              className={`${sx.newWrap.className} btns`}
              data-stylex-owner="project-milestones-new-wrap"
            >
              <Link
                {...LEGACY_MILESTONE_LIST_LINK_PROPS}
                to="/$ownerName/$projectName/newMilestoneForm"
                params={{ ownerName, projectName }}
                {...sx.newButton}
                className={`${sx.newButton.className} ybtn ybtn-success`}
                data-stylex-owner="project-milestones-new"
              >
                {t("milestone.menu.new")}
              </Link>
            </div>
          ) : null}

          <ul
            {...sx.tabs}
            className={`${sx.tabs.className} nav nav-tabs`}
            data-stylex-owner="project-milestones-tabs"
          >
            {["open", "closed", "all"].map((state) => (
              <li
                {...sx.tab}
                className={`${sx.tab.className}${currentState === state ? " active" : ""}`}
                data-stylex-owner="project-milestones-tab"
                key={state}
              >
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
          <div
            {...sx.errorWrap}
            className={`${sx.errorWrap.className} error-wrap`}
            data-stylex-owner="project-milestones-empty"
          >
            <i
              {...emptyIcon}
              className={`${emptyIcon.className ?? ""} ico ico-err1`.trim()}
              data-stylex-owner="project-milestones-empty-icon"
            ></i>
            <p {...sx.errorMessage} data-stylex-owner="project-milestones-empty-message">
              {t("milestone.is.empty")}
            </p>
          </div>
        ) : (
          <>
            <div
              {...sx.filterWrap}
              className={`${sx.filterWrap.className} filter-wrap milestone`}
              data-stylex-owner="project-milestones-filter-wrap"
            >
              {milestones.length > 1 ? (
                <>
                  <div
                    {...sx.filters}
                    className={`${sx.filters.className} filters`}
                    data-stylex-owner="project-milestones-filters"
                  >
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
                  <div
                    {...sx.search}
                    className={`${sx.search.className} search search-bar`}
                    data-stylex-owner="project-milestones-search"
                  >
                    <input
                      name="filter"
                      {...sx.searchInput}
                      className={`${sx.searchInput.className} textbox`}
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
                      className={`${sx.searchButton.className} search-btn`}
                      data-stylex-owner="project-milestones-search-button"
                      type="submit"
                    >
                      <i {...sx.icon} className="yobicon-search"></i>
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="row-fluid" data-stylex-owner="project-milestones-row-fluid">
              <div>
                <ul
                  {...sx.list}
                  className={`${sx.list.className} milestones`}
                  data-stylex-owner="project-milestones-list"
                >
                  {milestones.map((milestone, index) => (
                    <MilestoneRow
                      key={stringField(milestone.id)}
                      filter={filter}
                      milestone={milestone}
                      ownerName={ownerName}
                      projectName={projectName}
                      search={{ ...search, state: currentState }}
                      isLast={index === milestones.length - 1}
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
      className={`${sx.filterLink.className}${isActive ? ` ${sx.filterActive.className}` : ""} filter${isActive ? " active" : ""}`}
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
  isLast,
}: {
  filter: string;
  milestone: ProjectMilestone;
  ownerName: string;
  projectName: string;
  search: MilestoneListSearch;
  isLast: boolean;
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
    <li
      {...(isLast ? sx.rowLast : sx.row)}
      className={`${(isLast ? sx.rowLast : sx.row).className} milestone`}
      data-stylex-owner="project-milestones-item"
    >
      <div
        {...sx.infos}
        className={`${sx.infos.className} infos`}
        data-stylex-owner="project-milestones-infos"
      >
        <div
          {...sx.meta}
          className={`${sx.meta.className} meta-info`}
          data-stylex-owner="project-milestones-meta"
        >
          <strong className="version"></strong>
          <Link
            {...LEGACY_MILESTONE_LIST_LINK_PROPS}
            onClick={lockedLinkClick}
            to="/$ownerName/$projectName/milestone/$milestoneId"
            params={{ ownerName, projectName, milestoneId: stringField(milestone.id) }}
            search={{}}
            {...sx.name}
            className={`${sx.name.className} milestone-name`}
            data-stylex-owner="project-milestones-name"
          >
            {stringField(milestone.title)}
          </Link>
          <span
            {...sx.separator}
            className={`${sx.separator.className} sp`}
            data-stylex-owner="project-milestones-separator"
          >
            |
          </span>
          <span
            {...sx.issue}
            data-stylex-owner="project-milestones-issue-count"
            className={`${sx.issue.className} issue-item`}
          >{`${closedCount} / ${totalCount}`}</span>
          {search.state === "all" ? (
            <>
              <span
                {...sx.separator}
                className={`${sx.separator.className} sp`}
                data-stylex-owner="project-milestones-separator"
              >
                |
              </span>
              <span className={`state nm ${isClosed ? "closed" : "open"}`}>
                {t(`milestone.state.${isClosed ? "closed" : "open"}`)}
              </span>
            </>
          ) : null}
          {dueDateLabel ? (
            <>
              <span
                {...sx.separator}
                className={`${sx.separator.className} sp`}
                data-stylex-owner="project-milestones-separator"
              >
                |
              </span>
              <span
                {...(isClosed
                  ? sx.dueClosed
                  : booleanField(milestone.dueDateOverdue)
                    ? sx.dueOver
                    : sx.due)}
                className={`${
                  (isClosed
                    ? sx.dueClosed
                    : booleanField(milestone.dueDateOverdue)
                      ? sx.dueOver
                      : sx.due
                  ).className
                } ${isClosed ? "due-date ml5" : booleanField(milestone.dueDateOverdue) ? "due-date over" : "due-date"}`}
              >
                {t("label.dueDate")}
                <strong>{dueDateLabel}</strong>
                {isClosed ? null : (
                  <span className="date" data-stylex-owner="project-milestones-until">
                    ({stringField(milestone.untilLabel)})
                  </span>
                )}
              </span>
            </>
          ) : null}
          <div {...sx.completion} className={sx.completion.className}>
            <span
              {...sx.completionNumber}
              className={`${sx.completionNumber.className} number completion-rate`}
              data-stylex-owner="project-milestones-completion"
            >
              {totalCount > 0 ? `${completionPercent} %` : ""}
            </span>
          </div>
        </div>

        <div
          className={`${sx.progressWrap.className} progress-wrap`}
          data-stylex-owner="project-milestones-progress-wrap"
        >
          <div
            className={`${sx.progress.className} progress progress-success`}
            data-stylex-owner="project-milestones-progress"
          >
            <div
              {...sx.progressBar(`${completionPercent}%`)}
              className={`${sx.progressBar(`${completionPercent}%`).className} bar`}
              data-stylex-owner="project-milestones-progress-bar"
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
  const style = hidden ? { display: "none" } : undefined;
  const issueNumber = stringField(issue.issueNumber);
  const issueTitle = stringField(issue.title);
  const assigneeLabel = stringField(issue.assigneeLabel);
  const titleText = assigneeLabel ? `${issueTitle} - ${assigneeLabel}` : issueTitle;

  return (
    <Link
      {...LEGACY_MILESTONE_LIST_LINK_PROPS}
      {...sx.issueLink}
      className={`${sx.issueLink.className} issue-link`}
      data-stylex-owner={
        style ? "project-milestones-hidden-issue-link" : "project-milestones-issue-link"
      }
      to="/$ownerName/$projectName/issue/$issueNumber"
      params={{ ownerName, projectName, issueNumber }}
      target="_blank"
      {...(style ? stylex.props(milestoneListStyles.hiddenIssueLink) : {})}
    >
      <div {...sx.issueItem} className={`${sx.issueItem.className} issue-item`}>
        <span
          {...(state === "closed" ? sx.issueStateClosed : sx.issueStateOpen)}
          className={`${(state === "closed" ? sx.issueStateClosed : sx.issueStateOpen).className} state-label ${state}`}
        >
          {state === "closed" ? <i className="yobicon-checkmark"></i> : null}
        </span>
        <span
          {...sx.itemName}
          className={`${sx.itemName.className} item-name`}
          data-stylex-owner="project-milestones-issue-name"
        >
          <span
            {...sx.issueNumber}
            className={`${sx.issueNumber.className} number`}
            data-stylex-owner="project-milestones-issue-number"
          >
            #{issueNumber}
          </span>
          {titleText}
          {sortLabels(issue.labels).map((label) =>
            (() => {
              return (
                <IssueLabel
                  key={stringField(label.id)}
                  {...sx.label}
                  className={`${sx.label.className} label list-label`}
                  color={cssBackgroundColor(stringField(label.color))}
                  labelId={stringField(label.id)}
                  data-category-id={stringField(label.categoryId)}
                >
                  {stringField(label.name)}
                </IssueLabel>
              );
            })(),
          )}
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
