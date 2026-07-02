import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type {
  AnchorHTMLAttributes,
  ComponentType,
  CSSProperties,
  FormEvent,
  HTMLAttributes,
  KeyboardEvent,
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
    activeProps?: { className: undefined };
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
  const queryClient = useQueryClient();
  const [defaultLoginNotice, setDefaultLoginNotice] = useState<{
    key: number;
    message: string;
  } | null>(null);
  const [isDefaultLoginPageSet, setIsDefaultLoginPageSet] = useState(false);
  const [useTwoColumnMode, setUseTwoColumnMode] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const [showSubtasksAlways, setShowSubtasksAlways] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("showSubtasksAlways") === "true",
  );
  const setDefaultLoginPage = useMutation({
    mutationFn: async (path: string) => {
      const response = await fetch(
        `${prefixBasePath(basePath, "/user/defultLoginPage")}?path=${encodeURIComponent(`/${path}`)}`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json() as Promise<{ defaultLoginPage: string }>;
    },
    onError(error) {
      window.alert(`set Default page failed: ${error instanceof Error ? error.message : error}`);
    },
    onSuccess(_data, path) {
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.session() });
      setDefaultLoginNotice({
        key: Date.now(),
        message: `Set to default: ${path}`,
      });
      setIsDefaultLoginPageSet(true);
    },
  });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("filter") ?? "");
    router.history.push(userIssuesHref({ query }));
  };
  const userIssuesHref = (
    next: Partial<
      Pick<UserIssuesSearch, "filter" | "orderBy" | "orderDir" | "pageNum" | "query" | "state">
    >,
  ) => {
    const params = new URLSearchParams();
    params.set("filter", next.filter ?? search.filter);
    params.set("orderBy", next.orderBy ?? search.orderBy);
    params.set("orderDir", next.orderDir ?? search.orderDir);
    const pageNum = next.pageNum ?? search.pageNum;
    if (pageNum !== 1) {
      params.set("pageNum", String(pageNum));
    }
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
        <MySeriesMenuTabs
          hideDefaultLoginPageButton={isDefaultLoginPageSet}
          onSetDefaultLoginPage={(path) => setDefaultLoginPage.mutate(path)}
        />
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
                <ShowSubtasksCheckbox
                  checked={showSubtasksAlways}
                  onToggle={(checked) => {
                    localStorage.setItem("showSubtasksAlways", String(checked));
                    setShowSubtasksAlways(checked);
                  }}
                />
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
                ) : (
                  <div className="filter-wrap small-heights"></div>
                )}
                <ul className="post-list-wrap my-issues">
                  {issues.items.map((issue) => (
                    <UserIssueItem
                      basePath={basePath}
                      issue={issue}
                      key={
                        issue.id || `${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`
                      }
                      search={search}
                      showSubtasksAlways={showSubtasksAlways}
                      useTwoColumnMode={useTwoColumnMode}
                    />
                  ))}
                </ul>
                <IssuePagination
                  currentPage={search.pageNum}
                  search={search}
                  totalPages={totalPages(issues)}
                  onPageChange={(pageNum) => {
                    router.history.push(userIssuesHref({ pageNum }));
                  }}
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
      <YobiToast notice={defaultLoginNotice} />
    </div>
  );
}

function IssuePagination({
  currentPage,
  search,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  search: UserIssuesSearch;
  totalPages: number;
  onPageChange: (pageNum: number) => void;
}) {
  const { t } = useLegacyMessages();
  if (totalPages <= 0) {
    return <div id="pagination" data-total={totalPages}></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageRoutePath = (pageNum: number) => userIssuesRoutePath({ ...search, pageNum });
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    const value = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(value);
    onPageChange(value);
  };

  return (
    <div id="pagination" className="page-navigation-wrap" data-total={totalPages}>
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              to={pageRoutePath(currentPage - 1)}
              {...{ "pjax-page": "" }}
            >
              <i className="ico btn-pg-prev"></i>
              <span>{t("button.prevPage")}</span>
            </LegacyInternalLink>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{t("button.prevPage")}</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={currentPage}
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            type="number"
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
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              to={pageRoutePath(currentPage + 1)}
              {...{ "pjax-page": "" }}
            >
              <span>{t("button.nextPage")}</span>
              <i className="ico btn-pg-next"></i>
            </LegacyInternalLink>
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

function userIssuesRoutePath(search: UserIssuesSearch) {
  const params = new URLSearchParams();
  params.set("filter", search.filter);
  params.set("orderBy", search.orderBy);
  params.set("orderDir", search.orderDir);
  params.set("pageNum", String(search.pageNum));
  if (search.query) {
    params.set("query", search.query);
  }
  params.set("state", search.state);
  return `/user/issues?${params.toString()}`;
}

function clampPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}

function MySeriesMenuTabs({
  hideDefaultLoginPageButton,
  onSetDefaultLoginPage,
}: {
  hideDefaultLoginPageButton: boolean;
  onSetDefaultLoginPage: (path: string) => void;
}) {
  const { t } = useLegacyMessages();
  const defaultLoginPagePath = "user/issues";

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
          data-url={defaultLoginPagePath}
          title={t("button.setDefaultLoginPage")}
          data-trigger="hover"
          data-placement="bottom"
          data-toggle="popover"
          data-content={t("button.setDefaultLoginPage.desc")}
          style={hideDefaultLoginPageButton ? { display: "none" } : undefined}
          onClick={() => onSetDefaultLoginPage(defaultLoginPagePath)}
        >
          {t("button.setDefaultLoginPage")}
        </button>
      </li>
    </ul>
  );
}

function YobiToast({ notice }: { notice: { key: number; message: string } | null }) {
  if (!notice) {
    return null;
  }

  return (
    <div className="yobiToasts" key={notice.key}>
      <div className="toast" tabIndex={-1}>
        <div className="btn-dismiss">
          <button type="button" className="btn-transparent">
            &times;
          </button>
        </div>
        <div className="center-text">
          <span className="v"></span>
          <div className="msg">{notice.message}</div>
        </div>
      </div>
    </div>
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
              {!search.query && "count" in row && row.count != null ? `(${row.count})` : null}
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
  const pjaxItem = { "data-pjax": "" } as unknown as HTMLAttributes<HTMLLIElement>;

  return (
    <li className={active ? "active" : ""} {...pjaxItem}>
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
  showSubtasksAlways,
  useTwoColumnMode,
}: {
  basePath: string;
  issue: RestIssueListItem;
  search: UserIssuesSearch;
  showSubtasksAlways: boolean;
  useTwoColumnMode: boolean;
}) {
  const { t } = useLegacyMessages();
  const issueRoutePath = `/${issue.ownerName}/${issue.projectName}/issue/${issue.issueNumber}`;
  const projectRoutePath = `/${issue.ownerName}/${issue.projectName}`;
  const issueHref = prefixBasePath(basePath, issueRoutePath);
  const authorRoutePath = `/${issue.authorLoginId}`;
  const assigneeRoutePath = `/${issue.assigneeLoginId}`;
  const createdLabel = stringField(issue.createdLabel, issue.updatedLabel);
  const updatedLabel = stringField(issue.updatedLabel, createdLabel);
  const dateLabel = updatedLabel && updatedLabel !== createdLabel ? updatedLabel : createdLabel;
  const dateTooltipTitle =
    updatedLabel && updatedLabel !== createdLabel
      ? `Last Updated ${updatedLabel}`
      : `Created at ${createdLabel}`;
  const legacyHref = { href: issueHref } as unknown as LiHTMLAttributes<HTMLLIElement>;
  const showAuthor = search.filter !== "authored";
  const showAssignee = search.filter !== "assigned" && issue.assigneeLoginId;
  const issueWeight = issue.weight ?? 0;
  const [isChildListVisible, setIsChildListVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li
      className="post-item title"
      id={`issue-item-${issue.id}`}
      style={{
        ...(useTwoColumnMode ? { cursor: "pointer" } : {}),
        ...(isHovered ? { backgroundColor: "#fafafa" } : {}),
      }}
      {...legacyHref}
      onClick={() => {
        setIsChildListVisible(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          setIsChildListVisible(true);
        }
      }}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <div className="span12 span-hard-wrap">
        <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
          <span className="infos-item project-name">
            <LegacyInternalLink
              to={projectRoutePath}
              className="title project"
              data-toggle="tooltip"
              data-placement="bottom"
              title={t("project.name")}
            >
              {issue.projectName}
            </LegacyInternalLink>
          </span>
          <span className="infos-item post-id">#{issue.issueNumber}</span>
        </div>
        <div className="title-wrap span6">
          <span className="title-cell">
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
            <LegacyInternalLink
              to={issueRoutePath}
              className="title"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {issue.title}
            </LegacyInternalLink>
            <CommentVoteCounts issue={issue} issueHref={issueHref} />
            <span className="for-subtask-progressbar">
              <IssueSubtaskSummary issue={issue} />
            </span>
            {issue.labels.map((label) => (
              <LegacyInternalLink
                to={`${projectRoutePath}/issues?state=open&labelIds=${label.id}`}
                className={`label issue-label list-label twoColumeModeTarget ${contrastClassForLabelColor(label.color)}`}
                data-label-id={label.id}
                style={{ background: label.color }}
                key={String(label.id)}
              >
                {label.name}
              </LegacyInternalLink>
            ))}
            <div
              className="child-issue-list hide"
              style={showSubtasksAlways || isChildListVisible ? { display: "block" } : undefined}
            >
              <UserIssueChildRows issue={issue} />
            </div>
          </span>
        </div>
        {showAuthor ? (
          <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
            {issue.authorLoginId ? (
              <UserIssueAuthorLink
                label={issue.authorLabel}
                loginId={issue.authorLoginId}
                to={authorRoutePath}
              />
            ) : (
              <span className="infos-item">{t("issue.noAuthor")}</span>
            )}
          </div>
        ) : null}
        <div className={showAssignee ? "infos span2 meta" : "infos span3 meta"}>
          <span className="meta-cell">
            <span className="hide show-in-mobile">
              {showAuthor && issue.authorLoginId ? (
                <UserIssueAuthorLink
                  label={issue.authorLabel}
                  loginId={issue.authorLoginId}
                  to={authorRoutePath}
                />
              ) : showAuthor ? (
                <span className="infos-item">{t("issue.noAuthor")}</span>
              ) : null}
            </span>
            <span
              className="infos-item"
              data-toggle="tooltip"
              data-placement="bottom"
              title={dateTooltipTitle}
            >
              {dateLabel}
            </span>
            {issue.milestoneId ? (
              <span className="mileston-tag">
                <LegacyInternalLink
                  to={`${projectRoutePath}/milestone/${issue.milestoneId}`}
                  data-toggle="tooltip"
                  data-placement="bottom"
                  title={t("milestone")}
                >
                  {issue.milestoneTitle}
                </LegacyInternalLink>
              </span>
            ) : null}
            {issue.dueDateLabel ? (
              <span
                className={`pull-right${issue.dueDateOverdue ? " overdue" : ""}`}
                data-toggle="tooltip"
                data-placement="top"
                title={`Due date: ${issue.dueDateLabel}`}
              >
                <i className="yobicon-clock2"></i>
                {issue.state === "open" && issue.dueDateOverdue
                  ? t("issue.dueDate.overdue")
                  : issue.dueDateText || issue.dueDateLabel}
              </span>
            ) : null}
          </span>
        </div>
        {showAssignee ? (
          <div className="span1 hide-in-mobile">
            <div className="mt5 pull-right hide-in-mobile">
              <LegacyInternalLink
                to={assigneeRoutePath}
                className="avatar-wrap assinee"
                data-toggle="tooltip"
                data-placement="bottom"
                title={`${t("issue.assignee")}: ${issue.assigneeLabel}`}
              >
                <img
                  src={issue.assigneeAvatarUrl || "/assets/images/default-avatar-32.png"}
                  width="32"
                  height="32"
                  alt={issue.assigneeLabel ?? ""}
                />
              </LegacyInternalLink>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function UserIssueAuthorLink({
  label,
  loginId,
  to,
}: {
  label: string | undefined;
  loginId: string;
  to: string;
}) {
  return (
    <LegacyInternalLink
      to={to}
      className="infos-item infos-link-item author-cell"
      data-toggle="tooltip"
      data-placement="bottom"
      title={loginId}
    >
      {label}
    </LegacyInternalLink>
  );
}

type RestIssueChildLabel = {
  categoryId?: bigint | number | string | null;
  categoryName?: string;
  color?: string;
  id: bigint | number | string;
  name: string;
};

type RestIssueChildItem = {
  assigneeLabel?: string;
  commentCount?: number;
  createdLabel?: string;
  id?: bigint | number | string;
  isDraft?: boolean;
  issueNumber?: bigint | number | string;
  labels?: RestIssueChildLabel[];
  state?: string;
  title?: string;
  voterCount?: number;
};

function UserIssueChildRows({ issue }: { issue: RestIssueListItem }) {
  const openIssues = (issue.childIssues ?? []).filter(
    (childIssue) => childIssue.state !== "closed",
  );
  const closedIssues = (issue.childIssues ?? []).filter(
    (childIssue) => childIssue.state === "closed",
  );
  const childIssues = [...openIssues, ...closedIssues];
  if (!childIssues.length) {
    return null;
  }

  const parentIssueId = stringField(issue.id, "");
  return (
    <div className="child-issues">
      {childIssues.map((childIssue) => (
        <UserIssueChildRow
          issue={childIssue}
          key={`${childIssue.state}-${String(childIssue.issueNumber)}`}
          ownerName={issue.ownerName}
          parentIssueId={parentIssueId}
          projectName={issue.projectName}
        />
      ))}
    </div>
  );
}

function IssueSubtaskSummary({ issue }: { issue: RestIssueListItem }) {
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
          <LegacyInternalLink
            to={`/${issue.ownerName}/${issue.projectName}/issue/${parentIssueNumber}`}
          >
            {`#${parentIssueNumber} ${truncateParentIssueTitle(parentIssueTitle)}`}
          </LegacyInternalLink>
        </span>
      ) : null}
    </>
  );
}

function UserIssueChildRow({
  issue,
  ownerName,
  parentIssueId,
  projectName,
}: {
  issue: RestIssueChildItem;
  ownerName: string;
  parentIssueId: string;
  projectName: string;
}) {
  const issueId = stringField(issue.id, "");
  const issueNumber = stringField(issue.issueNumber, "");
  const projectPath = `/${ownerName}/${projectName}`;
  const issuePath = `${projectPath}/issue/${issueNumber}`;
  const isClosed = issue.state === "closed";
  const labels = (issue.labels ?? []).slice().sort(compareIssueLabels);
  const className =
    issueId && issueId === parentIssueId
      ? "issue-item selected-child child-issue"
      : "issue-item  child-issue";

  return (
    <div className={className}>
      <span className={`state-label ${isClosed ? "closed" : "open"}`}>
        {isClosed ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <LegacyInternalLink className="twoColumeModeTarget" to={issuePath}>
        <span className="item-name">
          <span className="subtask-number">
            {issue.isDraft ? <span className="draft-number">#Draft</span> : `#${issueNumber}`}
          </span>
          <span>{issue.title}</span>
          <span>{issue.assigneeLabel ? ` - ${issue.assigneeLabel}` : ""}</span>
        </span>
      </LegacyInternalLink>
      <span className="font12 no-border-at-child">
        <UserIssueChildCommentAndVotePair issue={issue} issuePath={issuePath} />
      </span>
      {labels.map((label) => (
        <LegacyInternalLink
          className={`label issue-label list-label active twoColumeModeTarget ${contrastClassForLabelColor(label.color)}`}
          data-category-id={String(label.categoryId ?? "")}
          data-label-id={String(label.id)}
          key={String(label.id)}
          style={childIssueLabelStyle(label.color)}
          to={`${projectPath}/issues?state=open&labelIds=${String(label.id)}`}
        >
          {label.name}
        </LegacyInternalLink>
      ))}
      <span className="child-issue-date" title={issue.createdLabel}>
        {issue.createdLabel}
      </span>
    </div>
  );
}

function childIssueLabelStyle(color: string | undefined): CSSProperties | undefined {
  return color ? { background: color } : undefined;
}

function UserIssueChildCommentAndVotePair({
  issue,
  issuePath,
}: {
  issue: RestIssueChildItem;
  issuePath: string;
}) {
  if (!issue.commentCount && !issue.voterCount) {
    return null;
  }

  return (
    <span className="item-count-groups">
      {issue.commentCount ? (
        <LegacyInternalLink
          className="comments-count comments-count-color"
          to={`${issuePath}#comments`}
        >
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{issue.commentCount}</span>
        </LegacyInternalLink>
      ) : null}
      {issue.voterCount ? (
        <LegacyInternalLink className="vote-count vote-color" to={`${issuePath}#vote`}>
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{issue.voterCount}</span>
        </LegacyInternalLink>
      ) : null}
    </span>
  );
}

function compareIssueLabels(left: RestIssueChildLabel, right: RestIssueChildLabel) {
  return `${left.categoryName ?? ""}\u0000${left.name}`.localeCompare(
    `${right.categoryName ?? ""}\u0000${right.name}`,
  );
}

function contrastClassForLabelColor(color: string | undefined) {
  const rgb = parseLabelColor(color);
  if (!rgb) {
    return "white";
  }
  const y709 = rgb.r * 0.21 + rgb.g * 0.72 + rgb.b * 0.07;
  return y709 > 192 ? "dimgray" : "white";
}

function parseLabelColor(color: string | undefined) {
  const value = color?.trim();
  if (!value) {
    return null;
  }
  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/iu)?.[1];
  if (hex) {
    const normalized =
      hex.length === 3
        ? hex
            .split("")
            .map((char) => `${char}${char}`)
            .join("")
        : hex;
    return {
      b: Number.parseInt(normalized.slice(4, 6), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      r: Number.parseInt(normalized.slice(0, 2), 16),
    };
  }

  const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/iu);
  return rgb
    ? {
        b: Number(rgb[3]),
        g: Number(rgb[2]),
        r: Number(rgb[1]),
      }
    : null;
}

function CommentVoteCounts({ issue, issueHref }: { issue: RestIssueListItem; issueHref: string }) {
  if (!issue.commentCount && !issue.voterCount) {
    return null;
  }

  return (
    <span className="item-count-groups">
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

function ShowSubtasksCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
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
          <input
            checked={checked}
            id="toggle-show-subtasks"
            type="checkbox"
            onChange={(event) => onToggle(event.currentTarget.checked)}
          />
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

function truncateParentIssueTitle(title: string) {
  const trimmed = title.slice(0, 10).trim();
  return title.length > 10 ? `${trimmed}...` : trimmed;
}
