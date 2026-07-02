import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type {
  AnchorHTMLAttributes,
  ComponentType,
  FormEvent,
  HTMLAttributes,
  LiHTMLAttributes,
  MouseEvent,
} from "react";
import { apiQueryKeys } from "../../api/query-keys";
import { currentSessionQueryOptions } from "../../api/session";
import {
  listUserIssues,
  type RestIssueListItem,
  type UserIssueListRestResponse,
} from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
  }
>;

type UserIssuesSearch = {
  filter: "assigned" | "authored" | "commented" | "favorite" | "mentioned" | "shared";
  orderBy: string;
  orderDir: string;
  pageNum: number;
  query: string;
  state: "closed" | "open";
};

export const Route = createFileRoute("/user/issues")({
  component: UserIssuesRoute,
  validateSearch(search: Record<string, unknown>): UserIssuesSearch {
    const filter = stringSearch(search.filter, "assigned");
    return {
      filter: isUserIssueFilter(filter) ? filter : "assigned",
      orderBy: stringSearch(search.orderBy, "updatedDate"),
      orderDir: stringSearch(search.orderDir, "desc"),
      pageNum: Number(search.pageNum) || 1,
      query: stringSearch(search.query),
      state: stringSearch(search.state, "open") === "closed" ? "closed" : "open",
    };
  },
});

function UserIssuesRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserIssuesScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function UserIssuesScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const search = Route.useSearch();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const issuesQuery = useQuery({
    queryFn: () =>
      listUserIssues(runtimeConfig, {
        filter: search.filter,
        orderBy: search.orderBy,
        orderDir: search.orderDir,
        pageNum: search.pageNum,
        query: search.query,
        state: search.state,
      }),
    queryKey: [
      ...apiQueryKeys.v1(),
      "user",
      "issues",
      search.filter,
      search.orderBy,
      search.orderDir,
      search.pageNum,
      search.query,
      search.state,
    ],
  });

  if (!issuesQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <UserIssuesBody
      currentUserId={stringField(issuesQuery.data.viewerUserId, sessionQuery.data.actorId)}
      issues={issuesQuery.data}
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}

function UserIssuesBody({
  currentUserId,
  issues,
  runtimeConfig,
  search,
}: {
  currentUserId: string;
  issues: UserIssueListRestResponse;
  runtimeConfig: RuntimeConfig;
  search: UserIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const basePath = runtimeConfig.basePath;
  const pjaxContainer = { "pjax-container": "" } as unknown as HTMLAttributes<HTMLDivElement>;
  const activeFilterIds = quickFilterIds(search.filter, currentUserId);
  const router = useRouter();
  const [useTwoColumnMode, setUseTwoColumnMode] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("filter") ?? "");
    router.history.push(userIssuesHref({ query }));
  };
  const userIssuesHref = (
    next: Partial<Pick<UserIssuesSearch, "filter" | "orderBy" | "orderDir" | "query" | "state">>,
  ) => {
    const params = new URLSearchParams();
    params.set("filter", next.filter ?? search.filter);
    params.set("orderBy", next.orderBy ?? search.orderBy);
    params.set("orderDir", next.orderDir ?? search.orderDir);
    const query = next.query ?? search.query;
    if (query) {
      params.set("query", query);
    }
    params.set("state", next.state ?? search.state);
    return `${prefixBasePath(basePath, "/user/issues")}?${params.toString()}`;
  };
  const navigateState = (
    event: MouseEvent<HTMLAnchorElement>,
    state: UserIssuesSearch["state"],
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
    router.history.push(userIssuesHref({ state }));
  };
  const navigateSort = (
    event: MouseEvent<HTMLAnchorElement>,
    orderBy: string,
    orderDir: string,
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
    router.history.push(userIssuesHref({ orderBy, orderDir }));
  };
  const navigateQuickFilter = (
    event: MouseEvent<HTMLAnchorElement>,
    filter: UserIssuesSearch["filter"],
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
    router.history.push(userIssuesHref({ filter }));
  };

  return (
    <div className="page-wrap-outer">
      <div className="page-wrap">
        <MySeriesMenuTabs />
        <div {...pjaxContainer} className="row-fluid issue-list-wrap">
          <div className="left-menu span2 span-hard-wrap">
            <div className="inner advanced">
              <QuickSearch
                counts={issues.sideFilterCounts}
                currentUserId={currentUserId}
                onNavigate={navigateQuickFilter}
                search={search}
              />
              <form
                id="search"
                name="search"
                action={prefixBasePath(basePath, "/user/issues")}
                method="get"
                onSubmit={submitSearch}
              >
                <input type="hidden" name="orderBy" value={search.orderBy} />
                <input type="hidden" name="orderDir" value={search.orderDir} />
                <input type="hidden" name="state" value={search.state} />
                <input
                  type="hidden"
                  name="authorId"
                  value={activeFilterIds.authorId}
                  data-search="authorId"
                />
                <input
                  type="hidden"
                  name="commenterId"
                  value={activeFilterIds.commenterId}
                  data-search="commenterId"
                />
                <input
                  type="hidden"
                  name="assigneeId"
                  value={activeFilterIds.assigneeId}
                  data-search="assigneeId"
                />
                <input
                  type="hidden"
                  name="mentionId"
                  value={activeFilterIds.mentionId}
                  data-search="mentionId"
                />
                <input
                  type="hidden"
                  name="sharerId"
                  value={activeFilterIds.sharerId}
                  data-search="sharerId"
                />
                <input
                  type="hidden"
                  name="favoriteId"
                  value={activeFilterIds.favoriteId}
                  data-search="favoriteId"
                />
                <div className="search myissues-search-input">
                  <div className="search-bar">
                    <input
                      ref={(element) => {
                        element?.setAttribute("value", search.query);
                      }}
                      name="filter"
                      className="textbox full"
                      type="text"
                      placeholder={t("issue.search")}
                      defaultValue={search.query}
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
                onNavigate={navigateState}
                state="open"
              />
              <StateTab
                active={search.state === "closed"}
                count={issues.closedIssueCount}
                label={t("issue.state.closed")}
                onNavigate={navigateState}
                state="closed"
              />
              <li>
                <TwoColumnModeCheckbox
                  checked={useTwoColumnMode}
                  onToggle={(checked) => {
                    localStorage.setItem("useTwoColumnMode", String(checked));
                    setUseTwoColumnMode(checked);
                  }}
                />
              </li>
              <li className="show-subtasks-li">
                <ShowSubtasksCheckbox />
              </li>
            </ul>
            {issues.items.length > 0 ? (
              <>
                {issues.items.length > 1 ? (
                  <IssueFilters
                    onNavigate={navigateSort}
                    orderBy={search.orderBy}
                    orderDir={search.orderDir}
                  />
                ) : null}
                <ul className="post-list-wrap my-issues">
                  {issues.items.map((issue) => (
                    <UserIssueItem
                      basePath={basePath}
                      issue={issue}
                      key={
                        issue.id || `${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`
                      }
                      search={search}
                      useTwoColumnMode={useTwoColumnMode}
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
  );
}

function MySeriesMenuTabs() {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs">
      <li>
        <LegacyInternalLink to="/notifications">{t("notification")}</LegacyInternalLink>
      </li>
      <li className="active">
        <LegacyInternalLink to="/user/issues">{t("issue.myIssue")}</LegacyInternalLink>
      </li>
      <li>
        <LegacyInternalLink to="/user/files">{t("user.files")}</LegacyInternalLink>
      </li>
      <li>
        <button
          type="button"
          className="ybtn hide-in-mobile"
          id="setDefaultLoginPage"
          data-url="user/issues"
          title={t("button.setDefaultLoginPage")}
          data-trigger="hover"
          data-placement="bottom"
          data-toggle="popover"
          data-content={t("button.setDefaultLoginPage.desc")}
        >
          {t("button.setDefaultLoginPage")}
        </button>
      </li>
    </ul>
  );
}

function QuickSearch({
  counts,
  currentUserId,
  onNavigate,
  search,
}: {
  counts: UserIssueListRestResponse["sideFilterCounts"];
  currentUserId: string;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, filter: UserIssuesSearch["filter"]) => void;
  search: UserIssuesSearch;
}) {
  const { t } = useLegacyMessages();
  const rows = [
    {
      className: "assigned-to-me",
      filter: "assigned",
      icon: "yobicon-user",
      label: t("issue.list.assignedToMe"),
    },
    {
      className: "authored-by-me",
      filter: "authored",
      icon: "yobicon-pencil",
      label: t("issue.list.authoredByMe"),
    },
    {
      className: "commented-by-me",
      filter: "commented",
      icon: "yobicon-comments",
      label: t("issue.list.commentedByMe"),
    },
    {
      className: "mentioned-of-me",
      count: counts?.mentioned,
      filter: "mentioned",
      icon: "yobicon-at",
      label: t("issue.list.mentionedOfMe"),
    },
    {
      className: "shared-with-me",
      count: counts?.shared,
      filter: "shared",
      icon: "yobicon-share",
      label: t("issue.list.sharedWithMe"),
    },
    {
      className: "favorite-issue",
      count: counts?.favorite,
      filter: "favorite",
      icon: "yobicon-favorite",
      label: t("issue.list.favorite"),
    },
  ] as const;

  return (
    <ul className="lst-stacked unstyled">
      {rows.map((row) => {
        const ids = quickFilterIds(row.filter, currentUserId);
        const pjaxFilter = { "pjax-filter": "" } as unknown as HTMLAttributes<HTMLAnchorElement>;
        return (
          <li className={search.filter === row.filter ? "active" : ""} key={row.filter}>
            {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy quick search uses href="#" plus pjax-filter data attrs. */}
            <a
              {...pjaxFilter}
              href="#"
              data-author-id={ids.authorId}
              data-assignee-id={ids.assigneeId}
              data-commenter-id={ids.commenterId}
              data-milestone-id=""
              data-mention-id={ids.mentionId}
              data-sharer-id={ids.sharerId}
              data-favorite-id={ids.favoriteId}
              onClick={(event) => onNavigate(event, row.filter)}
            >
              <span className={row.className}>
                <i className={row.icon}></i>
                {row.label}
              </span>
              {!search.query && "count" in row && row.count ? `(${row.count})` : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function StateTab({
  active,
  count,
  label,
  onNavigate,
  state,
}: {
  active: boolean;
  count: number;
  label: string;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, state: "closed" | "open") => void;
  state: "closed" | "open";
}) {
  const legacyState = { state } as unknown as HTMLAttributes<HTMLAnchorElement>;

  return (
    <li className={active ? "active" : ""}>
      {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus state attr. */}
      <a href="#" {...legacyState} onClick={(event) => onNavigate(event, state)}>
        {label}
        <span className="num-badge">{count}</span>
      </a>
    </li>
  );
}

function IssueFilters({
  onNavigate,
  orderBy,
  orderDir,
}: {
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, orderBy: string, orderDir: string) => void;
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
          const nextOrderDir = active ? nextDir : "desc";
          return (
            /* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy sort filters use href="#" plus order attrs. */
            <a
              href="#"
              ref={(element) => {
                element?.setAttribute("orderBy", filter.field);
                element?.setAttribute("orderDir", nextOrderDir);
              }}
              className={active ? "filter active" : "filter"}
              key={filter.field}
              onClick={(event) => onNavigate(event, filter.field, nextOrderDir)}
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

function UserIssueItem({
  basePath,
  issue,
  search,
  useTwoColumnMode,
}: {
  basePath: string;
  issue: RestIssueListItem;
  search: UserIssuesSearch;
  useTwoColumnMode: boolean;
}) {
  const { t } = useLegacyMessages();
  const projectHref = prefixBasePath(basePath, `/${issue.ownerName}/${issue.projectName}`);
  const issueHref = `${projectHref}/issue/${issue.issueNumber}`;
  const authorHref = prefixBasePath(basePath, `/${issue.authorLoginId}`);
  const assigneeHref = prefixBasePath(basePath, `/${issue.assigneeLoginId}`);
  const createdLabel = stringField(issue.createdLabel, issue.updatedLabel);
  const legacyHref = { href: issueHref } as unknown as LiHTMLAttributes<HTMLLIElement>;
  const showAuthor = search.filter !== "authored";
  const showAssignee = search.filter !== "assigned" && issue.assigneeLoginId;

  return (
    <li
      className="post-item title"
      id={`issue-item-${issue.id}`}
      style={useTwoColumnMode ? { cursor: "pointer" } : undefined}
      {...legacyHref}
    >
      <div className="span12 span-hard-wrap">
        <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
          <a
            href={projectHref}
            className="title project"
            data-toggle="tooltip"
            data-placement="bottom"
            title={t("project.name")}
          >
            {issue.projectName}
          </a>
          <span className="infos-item post-id">#{issue.issueNumber}</span>
        </div>
        <div className="title-wrap span6">
          <span className="title-cell">
            {issue.weight ? (
              <i
                className={`yobicon-${issue.weight > 0 ? "up" : "down"}-vote issue-weight`}
                data-toggle="tooltip"
                data-placement="top"
                title={t("issue.weight")}
              ></i>
            ) : null}
            <a href={issueHref} className="title">
              {issue.title}
            </a>
            <CommentVoteCounts issue={issue} issueHref={issueHref} />
            <span className="for-subtask-progressbar"></span>
            {issue.labels.map((label) => (
              <a
                href={`${projectHref}/issues?state=${search.state}&labelIds=${label.id}`}
                className="label issue-label list-label twoColumeModeTarget"
                data-label-id={label.id}
                style={{ background: label.color }}
                key={String(label.id)}
              >
                {label.name}
              </a>
            ))}
            <div className="child-issue-list hide"></div>
          </span>
        </div>
        {showAuthor ? (
          <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
            {issue.authorLoginId ? (
              <a
                href={authorHref}
                className="infos-link-item author-cell"
                data-toggle="tooltip"
                data-placement="top"
                title={issue.authorLoginId}
              >
                {issue.authorLabel}
              </a>
            ) : (
              <span className="infos-item">{t("issue.noAuthor")}</span>
            )}
          </div>
        ) : null}
        <div className={showAssignee ? "infos span2 meta" : "infos span3 meta"}>
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
          {issue.dueDateLabel ? (
            <span
              className={`infos-item due-date${issue.dueDateOverdue ? " overdue" : ""}`}
              data-toggle="tooltip"
              data-placement="top"
              title={issue.dueDateLabel}
            >
              <i className="yobicon-clock2"></i>
              {issue.state === "open" && issue.dueDateOverdue
                ? t("issue.dueDate.overdue")
                : issue.dueDateText || issue.dueDateLabel}
            </span>
          ) : null}
        </div>
        {showAssignee ? (
          <div className="span1 hide-in-mobile">
            <div className="mt5 pull-right hide-in-mobile">
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
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function CommentVoteCounts({ issue, issueHref }: { issue: RestIssueListItem; issueHref: string }) {
  if (!issue.commentCount && !issue.voterCount) {
    return null;
  }

  return (
    <span className="infos-item item-count-groups">
      {issue.commentCount ? (
        <a href={`${issueHref}#comments`} className="comments-count">
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{issue.commentCount}</span>
        </a>
      ) : null}
      {issue.voterCount ? (
        <a href={`${issueHref}#vote`} className="vote-count">
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{issue.voterCount}</span>
        </a>
      ) : null}
    </span>
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
            checked={checked}
            id="two-column-mode"
            type="checkbox"
            onChange={(event) => onToggle(event.currentTarget.checked)}
          />
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

function quickFilterIds(filter: UserIssuesSearch["filter"], currentUserId: string) {
  return {
    assigneeId: filter === "assigned" ? currentUserId : "",
    authorId: filter === "authored" ? currentUserId : "",
    commenterId: filter === "commented" ? currentUserId : "",
    favoriteId: filter === "favorite" ? currentUserId : "",
    mentionId: filter === "mentioned" ? currentUserId : "",
    sharerId: filter === "shared" ? currentUserId : "",
  };
}

function totalPages(issues: UserIssueListRestResponse) {
  if (typeof issues.totalPages === "number") {
    return issues.totalPages;
  }
  const pageSize = Number(issues.pageSize) || 20;
  return Math.max(1, Math.ceil((Number(issues.totalCount) || 0) / pageSize));
}

function isUserIssueFilter(value: string): value is UserIssuesSearch["filter"] {
  return ["assigned", "authored", "commented", "favorite", "mentioned", "shared"].includes(value);
}

function stringSearch(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringField(value: unknown, fallback: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return typeof fallback === "string" ||
    typeof fallback === "number" ||
    typeof fallback === "bigint"
    ? String(fallback)
    : "";
}
