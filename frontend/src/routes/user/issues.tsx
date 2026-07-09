import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { CSSProperties, FormEvent, HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
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

type UserIssuesSearch = {
  filter: "assigned" | "authored" | "commented" | "favorite" | "mentioned" | "shared";
  orderBy: string;
  orderDir: string;
  pageNum: number;
  query: string;
  state: "closed" | "open";
};

type LegacyStateButtonAttrs = HTMLAttributes<HTMLButtonElement> & {
  state: UserIssuesSearch["state"];
};
type LegacyOrderButtonAttrs = HTMLAttributes<HTMLButtonElement> & {
  orderby: string;
  orderdir: string;
};
type LegacyIssueRowAttrs = HTMLAttributes<HTMLLIElement> & { href: string };
type LegacyTooltipAttrs = {
  "data-placement": "bottom";
};

const SHOW_SUBTASKS_POPOVER_STYLE: CSSProperties = {
  bottom: "100%",
  display: "block",
  left: "50%",
  marginBottom: "10px",
  minWidth: "150px",
  pointerEvents: "none",
  position: "absolute",
  transform: "translateX(-50%)",
};

const TWO_COLUMN_MODE_POPOVER_STYLE: CSSProperties = {
  bottom: "100%",
  display: "block",
  left: "50%",
  marginBottom: "10px",
  minWidth: "180px",
  pointerEvents: "none",
  position: "absolute",
  transform: "translateX(-50%)",
};

const SET_DEFAULT_LOGIN_PAGE_POPOVER_STYLE: CSSProperties = {
  display: "block",
  left: "50%",
  marginTop: "10px",
  minWidth: "190px",
  pointerEvents: "none",
  position: "absolute",
  top: "100%",
  transform: "translateX(-50%)",
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
        <UserIssuesTitle />
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserIssuesScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function UserIssuesTitle() {
  const { t } = useLegacyMessages();
  return <title>{t("issue.myIssue")}</title>;
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
    event: MouseEvent<HTMLButtonElement>,
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
    event: MouseEvent<HTMLButtonElement>,
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
    event: MouseEvent<HTMLButtonElement>,
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
        <div className="row-fluid issue-list-wrap">
          <div className="left-menu span2 span-hard-wrap">
            <div className="inner advanced">
              <QuickSearch
                counts={issues.sideFilterCounts}
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
                <input type="hidden" name="authorId" value={activeFilterIds.authorId} />
                <input type="hidden" name="commenterId" value={activeFilterIds.commenterId} />
                <input type="hidden" name="assigneeId" value={activeFilterIds.assigneeId} />
                <input type="hidden" name="mentionId" value={activeFilterIds.mentionId} />
                <input type="hidden" name="sharerId" value={activeFilterIds.sharerId} />
                <input type="hidden" name="favoriteId" value={activeFilterIds.favoriteId} />
                <div className="search myissues-search-input">
                  <div className="search-bar">
                    <input
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
    if (!/^\d+$/.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }
    const value = clampPageNum(Number(event.currentTarget.value), totalPages);
    event.currentTarget.value = String(value);
    onPageChange(value);
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
              to={pageRoutePath(currentPage - 1)}
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
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              to={pageRoutePath(currentPage + 1)}
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
  const [isDefaultLoginPagePopoverVisible, setIsDefaultLoginPagePopoverVisible] = useState(false);
  const defaultLoginPagePopoverTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const defaultLoginPageTitle = t("button.setDefaultLoginPage");
  const defaultLoginPageContent = t("button.setDefaultLoginPage.desc");
  const legacyTabActiveOptions = {
    exact: true,
    explicitUndefined: true,
    includeSearch: true,
  };
  const legacyTabActiveProps = {
    "aria-current": undefined,
    className: undefined,
    "data-status": undefined,
  };
  const clearDefaultLoginPagePopoverTimer = () => {
    if (defaultLoginPagePopoverTimer.current !== null) {
      window.clearTimeout(defaultLoginPagePopoverTimer.current);
      defaultLoginPagePopoverTimer.current = null;
    }
  };
  const showDefaultLoginPagePopover = () => {
    clearDefaultLoginPagePopoverTimer();
    defaultLoginPagePopoverTimer.current = window.setTimeout(() => {
      setIsDefaultLoginPagePopoverVisible(true);
      defaultLoginPagePopoverTimer.current = null;
    }, 100);
  };
  const hideDefaultLoginPagePopover = () => {
    clearDefaultLoginPagePopoverTimer();
    defaultLoginPagePopoverTimer.current = window.setTimeout(() => {
      setIsDefaultLoginPagePopoverVisible(false);
      defaultLoginPagePopoverTimer.current = null;
    }, 100);
  };

  return (
    <ul className="nav nav-tabs">
      <li>
        <Link
          activeOptions={legacyTabActiveOptions}
          activeProps={legacyTabActiveProps}
          to="/notifications"
        >
          {t("notification")}
        </Link>
      </li>
      <li className="active">
        <Link
          activeOptions={legacyTabActiveOptions}
          activeProps={legacyTabActiveProps}
          to="/user/issues"
        >
          {t("issue.myIssue")}
        </Link>
      </li>
      <li>
        <Link
          activeOptions={legacyTabActiveOptions}
          activeProps={legacyTabActiveProps}
          to="/user/files"
        >
          {t("user.files")}
        </Link>
      </li>
      <li style={{ position: "relative" }}>
        <button
          type="button"
          className="ybtn hide-in-mobile"
          id="setDefaultLoginPage"
          title={defaultLoginPageTitle}
          style={hideDefaultLoginPageButton ? { display: "none" } : undefined}
          onBlur={hideDefaultLoginPagePopover}
          onClick={() => {
            hideDefaultLoginPagePopover();
            onSetDefaultLoginPage(defaultLoginPagePath);
          }}
          onFocus={showDefaultLoginPagePopover}
          onMouseEnter={showDefaultLoginPagePopover}
          onMouseLeave={hideDefaultLoginPagePopover}
        >
          {defaultLoginPageTitle}
        </button>
        {isDefaultLoginPagePopoverVisible && !hideDefaultLoginPageButton ? (
          <div
            className="popover bottom"
            role="tooltip"
            style={SET_DEFAULT_LOGIN_PAGE_POPOVER_STYLE}
          >
            <div className="arrow" />
            <h3 className="popover-title">{defaultLoginPageTitle}</h3>
            <div className="popover-content">{defaultLoginPageContent}</div>
          </div>
        ) : null}
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
  onNavigate,
  search,
}: {
  counts: UserIssueListRestResponse["sideFilterCounts"];
  onNavigate: (event: MouseEvent<HTMLButtonElement>, filter: UserIssuesSearch["filter"]) => void;
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
        return (
          <li className={search.filter === row.filter ? "active" : ""} key={row.filter}>
            <button type="button" onClick={(event) => onNavigate(event, row.filter)}>
              <span className={row.className}>
                <i className={row.icon}></i>
                {row.label}
              </span>
              {!search.query && "count" in row && row.count != null ? `(${row.count})` : null}
            </button>
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
  onNavigate: (event: MouseEvent<HTMLButtonElement>, state: "closed" | "open") => void;
  state: "closed" | "open";
}) {
  const legacyStateButtonAttrs = { state } satisfies LegacyStateButtonAttrs;

  return (
    <li className={active ? "active" : ""}>
      <button
        type="button"
        {...legacyStateButtonAttrs}
        onClick={(event) => onNavigate(event, state)}
      >
        {label}
        <span className="num-badge">{count}</span>
      </button>
    </li>
  );
}

function IssueFilters({
  onNavigate,
  orderBy,
  orderDir,
}: {
  onNavigate: (event: MouseEvent<HTMLButtonElement>, orderBy: string, orderDir: string) => void;
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
          const legacyOrderAttrs = {
            orderby: filter.field,
            orderdir: nextOrderDir,
          } satisfies LegacyOrderButtonAttrs;
          return (
            <button
              type="button"
              {...legacyOrderAttrs}
              className={active ? "filter active" : "filter"}
              key={filter.field}
              onClick={(event) => onNavigate(event, filter.field, nextOrderDir)}
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
  const milestoneRoutePath = `${projectRoutePath}/milestone/${issue.milestoneId}`;
  const issueHref = prefixBasePath(basePath, issueRoutePath);
  const authorRoutePath = `/${issue.authorLoginId}`;
  const assigneeRoutePath = `/${issue.assigneeLoginId}`;
  const assigneeTitle = `${t("issue.assignee")}: ${issue.assigneeLabel}`;
  const createdLabel = stringField(issue.createdLabel, issue.updatedLabel);
  const updatedLabel = stringField(issue.updatedLabel, createdLabel);
  const dateLabel = updatedLabel && updatedLabel !== createdLabel ? updatedLabel : createdLabel;
  const dateTooltipTitle =
    updatedLabel && updatedLabel !== createdLabel
      ? `Last Updated ${updatedLabel}`
      : `Created at ${createdLabel}`;
  const showAuthor = search.filter !== "authored";
  const showAuthorLink = Boolean(issue.authorLoginId && issue.authorLabel);
  const showAssignee = search.filter !== "assigned" && issue.assigneeLoginId && issue.assigneeLabel;
  const issueWeight = issue.weight ?? 0;
  const [isChildListVisible, setIsChildListVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const legacyTooltipAttrs = {
    "data-placement": "bottom",
  } satisfies LegacyTooltipAttrs;
  const legacyIssueRowAttrs = {
    className: "post-item title",
    href: issueHref,
    id: `issue-item-${issue.id}`,
  } satisfies LegacyIssueRowAttrs;

  return (
    <li
      {...legacyIssueRowAttrs}
      style={{
        ...(useTwoColumnMode ? { cursor: "pointer" } : {}),
        ...(isHovered ? { backgroundColor: "#fafafa" } : {}),
      }}
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
            <Link
              to={projectRoutePath}
              className="title project"
              {...legacyTooltipAttrs}
              title={t("project.name")}
            >
              {issue.projectName}
            </Link>
          </span>
          <span className="infos-item post-id">#{issue.issueNumber}</span>
        </div>
        <div className="title-wrap span6">
          <span className="title-cell">
            {issueWeight > 0 ? (
              <span
                className="weight-up-arrow"
                data-placement="right"
                title={`${t("issue.weight")} ${issueWeight}`}
              >
                <i className="yobicon-angle-circled-up"></i>
              </span>
            ) : null}
            {issueWeight < 0 ? (
              <span
                className="weight-down-arrow"
                data-placement="right"
                title={`${t("issue.weight")} ${issueWeight}`}
              >
                <i className="yobicon-angle-circled-down"></i>
              </span>
            ) : null}
            <Link
              to={issueRoutePath}
              className="title"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {issue.title}
            </Link>
            <CommentVoteCounts issue={issue} issuePath={issueRoutePath} />
            <span className="for-subtask-progressbar">
              <IssueSubtaskSummary issue={issue} />
            </span>
            {issue.labels.map((label) => (
              <Link
                to={`${projectRoutePath}/issues?state=open&labelIds=${label.id}`}
                className={`label issue-label list-label twoColumeModeTarget ${contrastClassForLabelColor(label.color)}`}
                data-label-id={label.id}
                style={{ background: label.color }}
                key={String(label.id)}
              >
                {label.name}
              </Link>
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
            {showAuthorLink ? (
              <UserIssueAuthorLink
                label={issue.authorLabel ?? ""}
                loginId={issue.authorLoginId ?? ""}
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
              {showAuthor && showAuthorLink ? (
                <UserIssueAuthorLink
                  label={issue.authorLabel ?? ""}
                  loginId={issue.authorLoginId ?? ""}
                  to={authorRoutePath}
                />
              ) : showAuthor ? (
                <span className="infos-item">{t("issue.noAuthor")}</span>
              ) : null}
            </span>
            <span className="infos-item" data-placement="bottom" title={dateTooltipTitle}>
              {dateLabel}
            </span>
            {issue.milestoneId ? (
              <span className="mileston-tag">
                <Link to={milestoneRoutePath} {...legacyTooltipAttrs} title={t("milestone")}>
                  {issue.milestoneTitle}
                </Link>
              </span>
            ) : null}
            {issue.dueDateLabel ? (
              <span
                className={`pull-right${issue.dueDateOverdue ? " overdue" : ""}`}
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
              <Link
                to={assigneeRoutePath}
                className="avatar-wrap assinee"
                {...legacyTooltipAttrs}
                title={assigneeTitle}
              >
                <img
                  src={issue.assigneeAvatarUrl || "/assets/images/default-avatar-32.png"}
                  width="32"
                  height="32"
                  alt={issue.assigneeLabel ?? ""}
                />
              </Link>
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
  const legacyTooltipAttrs = {
    "data-placement": "bottom",
  } satisfies LegacyTooltipAttrs;

  return (
    <Link
      to={to}
      className="infos-item infos-link-item author-cell"
      {...legacyTooltipAttrs}
      title={loginId}
    >
      {label}
    </Link>
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
          <Link to={`/${issue.ownerName}/${issue.projectName}/issue/${parentIssueNumber}`}>
            {`#${parentIssueNumber} ${truncateParentIssueTitle(parentIssueTitle)}`}
          </Link>
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
      <Link className="twoColumeModeTarget" to={issuePath}>
        <span className="item-name">
          <span className="subtask-number">
            {issue.isDraft ? <span className="draft-number">#Draft</span> : `#${issueNumber}`}
          </span>
          <span>{issue.title}</span>
          <span>{issue.assigneeLabel ? ` - ${issue.assigneeLabel}` : ""}</span>
        </span>
      </Link>
      <span className="font12 no-border-at-child">
        <UserIssueChildCommentAndVotePair issue={issue} issuePath={issuePath} />
      </span>
      {labels.map((label) => (
        <Link
          className={`label issue-label list-label active twoColumeModeTarget ${contrastClassForLabelColor(label.color)}`}
          data-category-id={String(label.categoryId ?? "")}
          data-label-id={String(label.id)}
          key={String(label.id)}
          style={childIssueLabelStyle(label.color)}
          to={`${projectPath}/issues?state=open&labelIds=${String(label.id)}`}
        >
          {label.name}
        </Link>
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
        <Link className="comments-count comments-count-color" to={issuePath} hash="comments">
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{issue.commentCount}</span>
        </Link>
      ) : null}
      {issue.voterCount ? (
        <Link className="vote-count vote-color" to={issuePath} hash="vote">
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{issue.voterCount}</span>
        </Link>
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

function CommentVoteCounts({ issue, issuePath }: { issue: RestIssueListItem; issuePath: string }) {
  if (!issue.commentCount && !issue.voterCount) {
    return null;
  }

  return (
    <span className="item-count-groups">
      {issue.commentCount ? (
        <Link to={issuePath} hash="comments" className="comments-count">
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{issue.commentCount}</span>
        </Link>
      ) : null}
      {issue.voterCount ? (
        <Link to={issuePath} hash="vote" className="vote-count">
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{issue.voterCount}</span>
        </Link>
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
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const popoverTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const popoverTitle = t("common.two.column.mode");
  const popoverContent = t("common.two.column.mode.desc");
  const clearPopoverTimer = () => {
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  };
  const showPopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(true);
      popoverTimer.current = null;
    }, 100);
  };
  const hidePopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(false);
      popoverTimer.current = null;
    }, 100);
  };

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title={popoverTitle}
      style={{ position: "relative" }}
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
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
      {isPopoverVisible ? (
        <div className="popover top" role="tooltip" style={TWO_COLUMN_MODE_POPOVER_STYLE}>
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">
            <p>{popoverContent}</p>
          </div>
        </div>
      ) : null}
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
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const popoverTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const popoverTitle = t("common.show.subtasks");
  const popoverContent = t("common.show.subtasks.desc");
  const clearPopoverTimer = () => {
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  };
  const showPopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(true);
      popoverTimer.current = null;
    }, 100);
  };
  const hidePopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(false);
      popoverTimer.current = null;
    }, 100);
  };

  return (
    <div
      className="show-subtasks mr10"
      id="two-column-mode-checkbox"
      title={popoverTitle}
      style={{ position: "relative" }}
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
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
      {isPopoverVisible ? (
        <div className="popover top" role="tooltip" style={SHOW_SUBTASKS_POPOVER_STYLE}>
          <div className="arrow" />
          <h3 className="popover-title">{popoverTitle}</h3>
          <div className="popover-content">{popoverContent}</div>
        </div>
      ) : null}
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
