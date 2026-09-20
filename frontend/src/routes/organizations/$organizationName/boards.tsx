import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  type Register,
  type SearchMiddleware,
  type SearchSchemaInput,
  useRouter,
} from "@tanstack/react-router";
import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  listOrganizationBoardsQueryOptions,
  type BoardPostListItem,
  type OrganizationBoardsResponse,
} from "../../../api/boards";
import { readOrganizationContainerRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationContainer } from "../../../api/types";
import { TwoColumnModeCheckbox } from "../../../components/two-column-mode-checkbox";
import { formatLegacyTimestamp, useLegacyMessages } from "../../../i18n";
import { type RuntimeConfig } from "../../../runtime-config";
import { OrganizationProjectPicker } from "../-project-picker";

type OrganizationBoardsSearch = {
  filter: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  projectNames: string[];
};
type OrganizationBoardsSearchInput = Partial<OrganizationBoardsSearch> &
  SearchSchemaInput & {
    "projectNames[]"?: unknown;
  };
type SearchMiddlewareContext<TSearchSchema> = Parameters<SearchMiddleware<TSearchSchema>>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Legacy BoardApp sort links carry ONLY orderBy/orderDir; the reset middleware
// re-adds empty defaults, so strip them back out — but only when they were
// NOT explicitly present in the URL (legacy keeps pageNum=1 the user
// navigated to; yobi.Pagination.js urlWithPageNum never drops it).
const stripLegacyBoardSearchDefaults = (ctx: SearchMiddlewareContext<OrganizationBoardsSearch>) => {
  // TanStack merges the Link's search over the current search; meta.explicit
  // records exactly what the navigation itself supplied (the Link's search
  // object). Presence checks must use that, not ctx.search.
  const result = { ...ctx.next(ctx.search) };
  const explicit = isRecord(ctx.meta?.explicit) ? ctx.meta.explicit : {};
  // Org menu Board links pass the FULL default search object (filter:"",
  // orderBy:"updatedDate", orderDir:"desc", pageNum:1, projectNames:[]) —
  // legacy renders those as a bare @routes.BoardApp.board() href with no
  // query, so collapse the all-defaults case to an empty search.
  const allKeysPresent =
    "filter" in explicit &&
    "pageNum" in explicit &&
    ("projectNames" in explicit || "projectNames[]" in explicit) &&
    "orderBy" in explicit &&
    "orderDir" in explicit;
  const isAllDefaults =
    allKeysPresent &&
    (explicit.filter === "" || explicit.filter === undefined) &&
    (explicit.pageNum === undefined || explicit.pageNum === 1) &&
    (explicit.projectNames === undefined ||
      (Array.isArray(explicit.projectNames) && explicit.projectNames.length === 0)) &&
    (explicit["projectNames[]"] === undefined ||
      (Array.isArray(explicit["projectNames[]"]) && explicit["projectNames[]"].length === 0)) &&
    explicit.orderBy === "updatedDate" &&
    explicit.orderDir === "desc";
  if (isAllDefaults) {
    Reflect.deleteProperty(result, "filter");
    Reflect.deleteProperty(result, "pageNum");
    Reflect.deleteProperty(result, "projectNames");
    Reflect.deleteProperty(result, "orderBy");
    Reflect.deleteProperty(result, "orderDir");
    return result;
  }
  // Sort links pass only orderBy/orderDir; pagination/filter navigation keeps
  // its explicit params. Strip keys absent from the navigation's own search
  // (legacy sort links carry ONLY orderBy/orderDir; yobi.Pagination.js never
  // drops explicitly navigated pageNum). pageNum is value-based: the legacy
  // bare boards href has none (page 1), but any navigated pageNum > 1 must
  // survive — TanStack's meta.explicit does not reliably reflect the Link's
  // own search here, so presence checks would drop the next/prev pageNum.
  // Same value-based rationale as pageNum: the legacy bare/sort links have an
  // empty filter, but an actively filtered boards URL must keep it across
  // pagination navigation (TanStack explicit does not reflect the Link search).
  if ((result.filter ?? "") === "") Reflect.deleteProperty(result, "filter");
  if ((result.pageNum ?? 1) === 1) Reflect.deleteProperty(result, "pageNum");
  if (!("projectNames" in explicit) && !("projectNames[]" in explicit)) {
    Reflect.deleteProperty(result, "projectNames");
  }
  return result;
};

function validateOrganizationBoardsSearch(
  search: OrganizationBoardsSearchInput,
): OrganizationBoardsSearch {
  return {
    filter: stringSearch(search.filter),
    orderBy: stringSearch(search.orderBy, "updatedDate"),
    orderDir: stringSearch(search.orderDir, "desc"),
    pageNum: Number(search.pageNum) || 1,
    projectNames: arraySearch(search.projectNames ?? search["projectNames[]"]),
  };
}

export const Route = createFileRoute("/organizations/$organizationName/boards")<
  Register,
  typeof validateOrganizationBoardsSearch
>({
  component: OrganizationBoardsRoute,
  validateSearch: validateOrganizationBoardsSearch,
  search: {
    middlewares: [stripLegacyBoardSearchDefaults],
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
  const router = useRouter();
  const projectLogos = new Map(
    (organization.visibleProjects ?? []).map((project) => [
      project.projectName,
      stringField(project.logoUrl, ""),
    ]),
  );
  const organizationName = stringField(organization.organizationName, boards.organizationName);
  const hasNotices = boards.notices.length > 0 && search.pageNum === 1;
  const hasPosts = hasNotices || boards.items.length > 0;

  return (
    <>
      <title>{organizationName}</title>
      <div className="page-wrap-outer" data-owner="organization-boards-page">
        <div className="project-page-wrap" data-owner="organization-boards-shell">
          <div className="search-wrap underline" data-owner="organization-boards-search">
            <form id="option_form" className="pull-left" method="get" data-owner="organization-boards-search-form">
              <input type="hidden" name="orderBy" value={search.orderBy} />
              <input type="hidden" name="orderDir" value={search.orderDir} />
              <div className="project-selects span7">
                <OrganizationProjectPicker
                  projects={boards.visibleProjects.map((project) => ({
                    projectName: project.projectName,
                    logoUrl: projectLogos.get(project.projectName),
                  }))}
                  value={search.projectNames}
                  variant="projects"
                  onChange={(projectNames, form) => {
                    const params = new URLSearchParams({
                      orderBy: search.orderBy,
                      orderDir: search.orderDir,
                      filter: String(new FormData(form).get("filter") ?? ""),
                    });
                    for (const projectName of projectNames)
                      params.append("projectNames[]", projectName);
                    void router.navigate({
                      to: `/organizations/${encodeURIComponent(organizationName)}/boards?${params.toString()}`,
                    });
                  }}
                />
              </div>
              <div className="search-bar span4">
                <input
                  name="filter"
                  className="textbox group-board"
                  data-owner="organization-boards-search-input"
                  type="text"
                  placeholder={t("title.searchByKeyword")}
                  defaultValue={search.filter}
                />
                <button type="submit" className="search-btn">
                  <i className="yobicon-search"></i>
                </button>
              </div>
              <TwoColumnModeCheckbox
                anchorOwner="organization-boards-two-column-anchor"
                popoverOwner="organization-boards-two-column-popover"
                wrapPopoverContentInP
              />
            </form>
          </div>

          {!hasPosts ? (
            <div className="error-wrap" data-owner="organization-boards-empty">
              <i className="ico ico-err1" data-owner="organization-boards-empty-icon"></i>
              <p data-owner="organization-boards-empty-message">{t("post.is.empty")}</p>
            </div>
          ) : (
            <>
              {boards.totalCount > 1 ? (
                <BoardFilters organizationName={organizationName} search={search} />
              ) : null}
              {hasNotices ? (
                <ul
                  className="post-list-wrap notice-wrap"
                  data-owner="organization-boards-notice-list"
                >
                  {boards.notices.map((post) => (
                    <OrganizationBoardPost
                      key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                      post={post}
                    />
                  ))}
                </ul>
              ) : null}
              <ul className="post-list-wrap" data-owner="organization-boards-list">
                {boards.items.map((post) => (
                  <OrganizationBoardPost
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    post={post}
                  />
                ))}
              </ul>
            </>
          )}

          <div className="write-btn-wrap" data-owner="organization-boards-actions"></div>
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
      <div className="filters" data-owner="organization-boards-filters">
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
                orderBy: filter.field,
                orderDir: active ? nextDir : "desc",
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
    <div
      id="pagination"
      className="page-navigation-wrap"
      data-owner="organization-boards-pagination"
    >
      <ul className="page-nums" data-owner="organization-boards-pagination-page-nums">
        <li className="page-num ikon" data-owner="organization-boards-pagination-prev-page">
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
              <i
                className="ico btn-pg-prev"
                data-owner="organization-boards-pagination-prev-icon"
              ></i>
              <span data-owner="organization-boards-pagination-prev-label">
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                className="ico btn-pg-prev off"
                data-owner="organization-boards-pagination-prev-icon"
              ></i>
              <span className="off" data-owner="organization-boards-pagination-prev-label">
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li className="page-num" data-owner="organization-boards-pagination-input-page">
          <input
            className="input-mini nospinner"
            data-owner="organization-boards-pagination-input"
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
        <li className="page-num delimiter" data-owner="organization-boards-pagination-delimiter">
          /
        </li>
        <li className="page-num" data-owner="organization-boards-pagination-total">
          {pages}
        </li>
        <li className="page-num ikon" data-owner="organization-boards-pagination-next-page">
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
              <span data-owner="organization-boards-pagination-next-label">
                {t("button.nextPage")}
              </span>
              <i
                className="ico btn-pg-next"
                data-owner="organization-boards-pagination-next-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span className="off" data-owner="organization-boards-pagination-next-label">
                {t("button.nextPage")}
              </span>
              <i
                className="ico btn-pg-next off"
                data-owner="organization-boards-pagination-next-icon"
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function OrganizationBoardPost({ post }: { post: BoardPostListItem }) {
  const { t } = useLegacyMessages();
  const created = formatLegacyTimestamp(post.createdAt, t);
  return (
    <li className="post-item title" data-owner="organization-boards-row">
      <Link
        to="/$user"
        params={{ user: post.authorLoginId }}
        className="avatar-wrap mlarge hide-in-mobile"
        data-owner="organization-boards-row-avatar"
        title={post.authorLoginId}
      >
        <img src={post.authorAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />
      </Link>
      <div className="title-wrap" data-owner="organization-boards-row-title-wrap">
        <Link
          to="/$ownerName/$projectName/post/$postNumber"
          params={{
            ownerName: post.ownerName,
            projectName: post.projectName,
            postNumber: String(post.postNumber),
          }}
          className="title"
          data-owner="organization-boards-title"
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
        <span className="post-id" data-owner="organization-boards-row-post-id">
          #{post.postNumber}
        </span>
        <span className="infos-item" title={created.title}>
          {created.label}
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
