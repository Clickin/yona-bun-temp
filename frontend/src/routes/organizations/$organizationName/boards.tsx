import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  listOrganizationBoardsQueryOptions,
  type BoardPostListItem,
  type OrganizationBoardsResponse,
} from "../../../api/boards";
import { readOrganizationContainerRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationContainer } from "../../../api/types";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";

type OrganizationBoardsSearch = {
  filter: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  projectNames: string[];
};

type LegacyPostItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };

const TWO_COLUMN_MODE_POPOVER_STYLE: CSSProperties = {
  bottom: "100%",
  display: "block",
  left: "50%",
  marginBottom: "5px",
  position: "absolute",
  transform: "translateX(-50%)",
};

export const Route = createFileRoute("/organizations/$organizationName/boards")({
  component: OrganizationBoardsRoute,
  validateSearch(search: Record<string, unknown>): OrganizationBoardsSearch {
    return {
      filter: stringSearch(search.filter),
      orderBy: stringSearch(search.orderBy, "updatedDate"),
      orderDir: stringSearch(search.orderDir, "desc"),
      pageNum: Number(search.pageNum) || 1,
      projectNames: arraySearch(search.projectNames ?? search["projectNames[]"]),
    };
  },
});

function OrganizationBoardsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <OrganizationBoardsScreen runtimeConfig={runtimeConfig} />;
}

function OrganizationBoardsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const search = Route.useSearch();
  const organizationQuery = useQuery({
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });
  const boardsQuery = useQuery(
    listOrganizationBoardsQueryOptions(runtimeConfig, { organizationName, ...search }),
  );

  if (!organizationQuery.data || !boardsQuery.data) {
    return null;
  }

  return (
    <OrganizationBoardsBody
      boards={boardsQuery.data}
      organization={organizationQuery.data}
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}

function OrganizationBoardsBody({
  boards,
  organization,
  runtimeConfig,
  search,
}: {
  boards: OrganizationBoardsResponse;
  organization: OrganizationContainer;
  runtimeConfig: RuntimeConfig;
  search: OrganizationBoardsSearch;
}) {
  const { t } = useLegacyMessages();
  const organizationName = stringField(organization.organizationName, boards.organizationName);
  const hasNotices = boards.notices.length > 0 && search.pageNum === 1;
  const hasPosts = hasNotices || boards.items.length > 0;

  return (
    <>
      <title>{organizationName}</title>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="search-wrap underline">
            <form id="option_form" method="get" className="pull-left">
              <input type="hidden" name="orderBy" value={search.orderBy} />
              <input type="hidden" name="orderDir" value={search.orderDir} />
              <div className="project-selects span7">
                <select
                  id="projects"
                  name="projectNames[]"
                  data-format="projects"
                  multiple
                  data-placeholder={t("organization.choose.projects")}
                  data-container-css-class="fullsize"
                  defaultValue={search.projectNames}
                  onChange={(event) => {
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  {boards.visibleProjects.map((project) => {
                    const projectName = project.projectName;
                    return (
                      <option value={projectName} key={projectName}>
                        {projectName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="search-bar span4">
                <input
                  name="filter"
                  className="textbox group-board"
                  type="text"
                  placeholder={t("title.searchByKeyword")}
                  defaultValue={search.filter}
                />
                <button type="submit" className="search-btn">
                  <i className="yobicon-search"></i>
                </button>
              </div>
              <TwoColumnModeCheckbox />
            </form>
          </div>

          {!hasPosts ? (
            <div className="error-wrap">
              <i className="ico ico-err1"></i>
              <p>{t("post.is.empty")}</p>
            </div>
          ) : (
            <>
              {boards.totalCount > 1 ? (
                <BoardFilters organizationName={organizationName} search={search} />
              ) : null}
              {hasNotices ? (
                <ul className="post-list-wrap notice-wrap">
                  {boards.notices.map((post) => (
                    <OrganizationBoardPost
                      basePath={runtimeConfig.basePath}
                      key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                      post={post}
                    />
                  ))}
                </ul>
              ) : null}
              <ul className="post-list-wrap">
                {boards.items.map((post) => (
                  <OrganizationBoardPost
                    basePath={runtimeConfig.basePath}
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    post={post}
                  />
                ))}
              </ul>
            </>
          )}

          <div className="write-btn-wrap"></div>
          <BoardPagination boards={boards} organizationName={organizationName} search={search} />
        </div>
      </div>
    </>
  );
}

function BoardFilters({
  organizationName,
  search,
}: {
  organizationName: string;
  search: OrganizationBoardsSearch;
}) {
  const { t } = useLegacyMessages();
  const filters = [
    { field: "updatedDate", label: t("common.order.updatedDate") },
    { field: "createdDate", label: t("common.order.date") },
    { field: "numOfComments", label: t("common.order.comments") },
  ];

  return (
    <div className="filter-wrap board">
      <div className="filters">
        {filters.map((filter) => {
          const active = search.orderBy === filter.field;
          const nextDir = active && search.orderDir === "desc" ? "asc" : "desc";
          return (
            <Link
              activeOptions={{ exact: true, includeSearch: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              className={active ? "filter active" : "filter"}
              key={filter.field}
              to="/organizations/$organizationName/boards"
              params={{ organizationName }}
              search={{
                filter: search.filter,
                orderBy: filter.field,
                orderDir: active ? nextDir : "desc",
                pageNum: search.pageNum,
                projectNames: search.projectNames,
              }}
            >
              <i
                className={`ico btn-gray-arrow ${
                  !active || search.orderDir === "desc" ? " down " : ""
                }`}
              ></i>
              {filter.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function BoardPagination({
  boards,
  organizationName,
  search,
}: {
  boards: OrganizationBoardsResponse;
  organizationName: string;
  search: OrganizationBoardsSearch;
}) {
  const router = useRouter();
  const { t } = useLegacyMessages();
  const pages = totalPages(boards);
  if (pages <= 1) {
    return <div id="pagination"></div>;
  }

  const currentPage = clampPageNum(boards.pageNum || search.pageNum, pages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < pages;
  const pageSearch = (pageNum: number) => ({
    ...search,
    pageNum,
    projectNames: [...search.projectNames],
  });
  const navigateToPage = (pageNum: number) => {
    void router.navigate({
      params: { organizationName },
      search: pageSearch(pageNum),
      to: "/organizations/$organizationName/boards",
    });
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^\d+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }
    const pageNum = clampPageNum(Number.parseInt(event.currentTarget.value, 10), pages);
    event.currentTarget.value = String(pageNum);
    navigateToPage(pageNum);
  };

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeOptions={{ exact: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={pageSearch(currentPage - 1)}
              to="/organizations/$organizationName/boards"
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
            key={currentPage}
            max={pages}
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
        <li className="page-num">{pages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              activeOptions={{ exact: true }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={pageSearch(currentPage + 1)}
              to="/organizations/$organizationName/boards"
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

function OrganizationBoardPost({ basePath, post }: { basePath: string; post: BoardPostListItem }) {
  const { t } = useLegacyMessages();
  const postHref = prefixBasePath(
    basePath,
    `/${post.ownerName}/${post.projectName}/post/${post.postNumber}`,
  );
  const legacyPostItemAttrs = {
    className: "post-item title",
    href: postHref,
  } satisfies LegacyPostItemAttrs;

  return (
    <li {...legacyPostItemAttrs}>
      <Link
        to="/$user"
        params={{ user: post.authorLoginId }}
        className="avatar-wrap mlarge hide-in-mobile"
        title={post.authorLoginId}
      >
        <img src={post.authorAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />
      </Link>
      <div className="title-wrap">
        <Link
          to="/$ownerName/$projectName/post/$postNumber"
          params={{
            ownerName: post.ownerName,
            projectName: post.projectName,
            postNumber: String(post.postNumber),
          }}
          className="title"
        >
          {post.title}
        </Link>
      </div>
      <div className="infos">
        {post.authorLabel ? (
          <Link
            to="/$user"
            params={{ user: post.authorLoginId }}
            className="infos-item infos-link-item"
            title={post.authorLoginId}
          >
            {post.authorLabel}
          </Link>
        ) : (
          <span className="infos-item">{t("issue.noAuthor")}</span>
        )}
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: post.ownerName, projectName: post.projectName }}
          className="infos-link-item group-project-name"
        >
          {post.projectName}
        </Link>
        <span className="post-id">#{post.postNumber}</span>
        <span className="infos-item" title={post.createdLabel}>
          {post.createdLabel}
        </span>
        {post.commentCount > 0 ? (
          <span className="infos-item item-count-groups">
            <Link
              to="/$ownerName/$projectName/post/$postNumber"
              params={{
                ownerName: post.ownerName,
                projectName: post.projectName,
                postNumber: String(post.postNumber),
              }}
              hash="comments"
            >
              <span className="count-groups item-icon ">
                <i className="yobicon-comments"></i>
              </span>
              <span className="count-groups item-count ">{post.commentCount}</span>
            </Link>
          </span>
        ) : null}
      </div>
    </li>
  );
}

function TwoColumnModeCheckbox() {
  const { t } = useLegacyMessages();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [useTwoColumnMode, setUseTwoColumnMode] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const clearPopoverTimers = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  const showDelayedPopover = () => {
    clearPopoverTimers();
    showTimerRef.current = setTimeout(() => setShowPopover(true), 100);
  };
  const hideDelayedPopover = () => {
    clearPopoverTimers();
    hideTimerRef.current = setTimeout(() => setShowPopover(false), 100);
  };

  useEffect(
    () => () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    },
    [],
  );

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
      style={{ position: "relative" }}
      onBlur={hideDelayedPopover}
      onFocus={showDelayedPopover}
      onMouseEnter={showDelayedPopover}
      onMouseLeave={hideDelayedPopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template wraps the checkbox this way. */}
      <label className="checkbox">
        <div className="two-column-icon-border">
          <input
            id="two-column-mode"
            type="checkbox"
            checked={useTwoColumnMode}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              localStorage.setItem("useTwoColumnMode", String(checked));
              setUseTwoColumnMode(checked);
            }}
          />
          <span className="two-column-mode-text">{t("common.two.column.view")}</span>
        </div>
      </label>
      {showPopover ? (
        <div className="popover top" role="tooltip" style={TWO_COLUMN_MODE_POPOVER_STYLE}>
          <div className="arrow"></div>
          <h3 className="popover-title">{t("common.two.column.mode")}</h3>
          <div className="popover-content">
            <p>{t("common.two.column.mode.desc")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
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

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function totalPages(boards: OrganizationBoardsResponse) {
  const providedTotalPages = Number((boards as Record<string, unknown>).totalPages);
  if (Number.isFinite(providedTotalPages) && providedTotalPages >= 0) {
    return providedTotalPages;
  }
  return Math.ceil(boards.totalCount / Math.max(boards.pageSize, 1));
}

function clampPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}
