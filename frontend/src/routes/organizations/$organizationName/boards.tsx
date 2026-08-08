import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  type Register,
  type SearchSchemaInput,
  useRouter,
} from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  listOrganizationBoardsQueryOptions,
  type BoardPostListItem,
  type OrganizationBoardsResponse,
} from "../../../api/boards";
import { readOrganizationContainerRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationContainer } from "../../../api/types";
import legacySpriteUrl from "../../../assets/legacy/sprite.png";
import { TwoColumnModeCheckbox } from "../../../components/two-column-mode-checkbox";
import { useLegacyMessages } from "../../../i18n";
import { type RuntimeConfig } from "../../../runtime-config";
import {
  organizationBoardsColors,
  organizationBoardsEmptyStyles,
  organizationBoardsPaginationStyles,
} from "./-organization-boards.stylex";

const errorIconSpriteStyles = stylex.create({
  sprite: (backgroundImage: string) => ({ backgroundImage }),
});

const styles = stylex.create({
  searchForm: { float: "left" },
  search: {
    borderBottomColor: organizationBoardsColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
  },
  filterInput: { color: organizationBoardsColors.mutedText, padding: "4px 6px" },
  filters: { color: organizationBoardsColors.mutedText },
  list: { listStyle: "none", margin: "0px", padding: "0px" },
  row: {
    borderBottomColor: organizationBoardsColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
  },
  rowAvatar: { float: "left", marginRight: "10px" },
  rowTitleWrap: {
    display: "block",
    lineHeight: "20px",
    overflow: "hidden",
    position: "relative",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowPostId: {
    color: organizationBoardsColors.postIdText,
    fontSize: "13px",
    fontWeight: "bold",
    marginRight: "5px",
  },
  twoColumnAnchor: { marginRight: "10px", position: "relative" },
  twoColumnPopover: {
    bottom: "100%",
    display: "block",
    left: "50%",
    marginBottom: "5px",
    position: "absolute",
    transform: "translateX(-50%)",
  },
  title: { color: organizationBoardsColors.titleText, textDecoration: "none" },
});

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
// Legacy BoardApp sort links carry ONLY orderBy/orderDir (urlToList?orderBy=..&orderDir=..);
// validateSearch supplies runtime defaults for the rest. Do NOT re-add empty params
// to the URL here — stripLegacyBoardSearchDefaults removes anything not explicit.
// Legacy BoardApp sort links carry ONLY orderBy/orderDir; validateSearch supplies
// runtime defaults for the rest. stripLegacyBoardSearchDefaults removes anything
// not explicitly present in the URL (see below).


// Legacy BoardApp sort links carry ONLY orderBy/orderDir; the reset middleware
// re-adds empty defaults, so strip them back out — but only when they were
// NOT explicitly present in the URL (legacy keeps pageNum=1 the user
// navigated to; yobi.Pagination.js urlWithPageNum never drops it).
const stripLegacyBoardSearchDefaults = ({
  search,
  next,
}: {
  search: OrganizationBoardsSearchInput;
  next: (search: OrganizationBoardsSearchInput) => OrganizationBoardsSearch;
}) => {
  // TanStack merges the Link's search over the CURRENT search; next(search,
  // true) returns { search, meta } where meta.explicit records exactly what
  // the navigation itself supplied (the Link's search object). Presence
  // checks must use that, not `search` (which always carries the current
  // page's params).
  const nextResult = next(search, true);
  const result = nextResult.search;
  const explicit = nextResult.meta?.explicit ?? search;
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
    (explicit.pageNum === undefined || Number(explicit.pageNum) === 1) &&
    (explicit.projectNames === undefined || explicit.projectNames?.length === 0) &&
    (explicit["projectNames[]"] === undefined || explicit["projectNames[]"]?.length === 0) &&
    explicit.orderBy === "updatedDate" &&
    explicit.orderDir === "desc";
  if (isAllDefaults) {
    delete result.filter;
    delete result.pageNum;
    delete result.projectNames;
    delete result.orderBy;
    delete result.orderDir;
    return result;
  }
  // Sort links pass only orderBy/orderDir; pagination/filter navigation keeps
  // its explicit params. Strip keys absent from the navigation's own search
  // (legacy sort links carry ONLY orderBy/orderDir; yobi.Pagination.js never
  // drops explicitly navigated pageNum).
  if (!("filter" in explicit)) delete result.filter;
  if (!("pageNum" in explicit)) delete result.pageNum;
  if (!("projectNames" in explicit) && !("projectNames[]" in explicit)) delete result.projectNames;
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
  const organizationName = stringField(organization.organizationName, boards.organizationName);
  const hasNotices = boards.notices.length > 0 && search.pageNum === 1;
  const hasPosts = hasNotices || boards.items.length > 0;
  const searchStyleProps = stylex.props(styles.search);
  const searchFormStyleProps = stylex.props(styles.searchForm);
  const filterInputStyleProps = stylex.props(styles.filterInput);
  const listStyleProps = stylex.props(styles.list);

  return (
    <>
      <title>{organizationName}</title>
      <div className="page-wrap-outer" data-stylex-owner="organization-boards-page">
        <div className="project-page-wrap" data-stylex-owner="organization-boards-shell">
          <div
            {...searchStyleProps}
            className={`search-wrap underline ${searchStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="organization-boards-search"
          >
            <form
              {...searchFormStyleProps}
              id="option_form"
              method="get"
              className={searchFormStyleProps.className}
              data-stylex-owner="organization-boards-search-form"
            >
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
                  {...filterInputStyleProps}
                  className={`textbox group-board ${filterInputStyleProps.className ?? ""}`.trim()}
                  data-stylex-owner="organization-boards-search-input"
                  type="text"
                  placeholder={t("title.searchByKeyword")}
                  defaultValue={search.filter}
                />
                <button type="submit" className="search-btn">
                  <i className="yobicon-search"></i>
                </button>
              </div>
              <TwoColumnModeCheckbox
                anchorStyle={styles.twoColumnAnchor}
                popoverStyle={styles.twoColumnPopover}
                anchorOwner="organization-boards-two-column-anchor"
                popoverOwner="organization-boards-two-column-popover"
                wrapPopoverContentInP
              />
            </form>
          </div>

          {!hasPosts ? (
            <div
              {...stylex.props(organizationBoardsEmptyStyles.errorWrap)}
              className={`${stylex.props(organizationBoardsEmptyStyles.errorWrap).className} error-wrap`.trim()}
              data-stylex-owner="organization-boards-empty"
            >
              <i
                {...stylex.props(organizationBoardsEmptyStyles.errorIcon)}
                {...stylex.props(errorIconSpriteStyles.sprite(`url(${legacySpriteUrl})`))}
                className={`${stylex.props(organizationBoardsEmptyStyles.errorIcon).className} ${stylex.props(errorIconSpriteStyles.sprite(`url(${legacySpriteUrl})`)).className ?? ""} ico ico-err1`.trim()}
                data-stylex-owner="organization-boards-empty-icon"
              ></i>
              <p
                {...stylex.props(organizationBoardsEmptyStyles.errorMessage)}
                className={stylex.props(organizationBoardsEmptyStyles.errorMessage).className}
                data-stylex-owner="organization-boards-empty-message"
              >
                {t("post.is.empty")}
              </p>
            </div>
          ) : (
            <>
              {boards.totalCount > 1 ? (
                <BoardFilters organizationName={organizationName} search={search} />
              ) : null}
              {hasNotices ? (
                <ul
                  {...listStyleProps}
                  className={`post-list-wrap notice-wrap ${listStyleProps.className ?? ""}`.trim()}
                  data-stylex-owner="organization-boards-notice-list"
                >
                  {boards.notices.map((post) => (
                    <OrganizationBoardPost
                      key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                      post={post}
                    />
                  ))}
                </ul>
              ) : null}
              <ul
                {...listStyleProps}
                className={`post-list-wrap ${listStyleProps.className ?? ""}`.trim()}
                data-stylex-owner="organization-boards-list"
              >
                {boards.items.map((post) => (
                  <OrganizationBoardPost
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    post={post}
                  />
                ))}
              </ul>
            </>
          )}

          <div className="write-btn-wrap" data-stylex-owner="organization-boards-actions"></div>
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
  const filtersStyleProps = stylex.props(styles.filters);
  const filters = [
    { field: "updatedDate", label: t("common.order.updatedDate") },
    { field: "createdDate", label: t("common.order.date") },
    { field: "numOfComments", label: t("common.order.comments") },
  ];

  return (
    <div className="filter-wrap board">
      <div
        {...filtersStyleProps}
        className={`filters ${filtersStyleProps.className ?? ""}`.trim()}
        data-stylex-owner="organization-boards-filters"
      >
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
      {...stylex.props(organizationBoardsPaginationStyles.paginationWrap)}
      id="pagination"
      className={`${stylex.props(organizationBoardsPaginationStyles.paginationWrap).className} page-navigation-wrap`}
      data-stylex-owner="organization-boards-pagination"
    >
      <ul
        {...stylex.props(organizationBoardsPaginationStyles.paginationPageNums)}
        className={`${stylex.props(organizationBoardsPaginationStyles.paginationPageNums).className} page-nums`}
        data-stylex-owner="organization-boards-pagination-page-nums"
      >
        <li
          {...stylex.props(
            organizationBoardsPaginationStyles.paginationPageNum,
            organizationBoardsPaginationStyles.paginationIconPageNum,
          )}
          className={`${stylex.props(organizationBoardsPaginationStyles.paginationPageNum, organizationBoardsPaginationStyles.paginationIconPageNum).className} page-num ikon`}
          data-stylex-owner="organization-boards-pagination-prev-page"
        >
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
                {...stylex.props(
                  organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl),
                  organizationBoardsPaginationStyles.paginationPrev,
                )}
                className={`${stylex.props(organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl), organizationBoardsPaginationStyles.paginationPrev).className} ico btn-pg-prev`}
                data-stylex-owner="organization-boards-pagination-prev-icon"
              ></i>
              <span
                {...stylex.props(organizationBoardsPaginationStyles.paginationIconLabel)}
                data-stylex-owner="organization-boards-pagination-prev-label"
              >
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                {...stylex.props(
                  organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl),
                  organizationBoardsPaginationStyles.paginationPrev,
                  organizationBoardsPaginationStyles.paginationPrevOff,
                )}
                className={`${stylex.props(organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl), organizationBoardsPaginationStyles.paginationPrev, organizationBoardsPaginationStyles.paginationPrevOff).className} ico btn-pg-prev off`}
                data-stylex-owner="organization-boards-pagination-prev-icon"
              ></i>
              <span
                {...stylex.props(organizationBoardsPaginationStyles.paginationIconLabelOff)}
                className={`${stylex.props(organizationBoardsPaginationStyles.paginationIconLabelOff).className} off`}
                data-stylex-owner="organization-boards-pagination-prev-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li
          {...stylex.props(organizationBoardsPaginationStyles.paginationPageNum)}
          className={`${stylex.props(organizationBoardsPaginationStyles.paginationPageNum).className} page-num`}
          data-stylex-owner="organization-boards-pagination-input-page"
        >
          <input
            {...stylex.props(
              organizationBoardsPaginationStyles.paginationInput,
              organizationBoardsPaginationStyles.paginationNoSpinner,
            )}
            className={`${stylex.props(organizationBoardsPaginationStyles.paginationInput, organizationBoardsPaginationStyles.paginationNoSpinner).className} input-mini nospinner`}
            data-stylex-owner="organization-boards-pagination-input"
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
        <li
          {...stylex.props(
            organizationBoardsPaginationStyles.paginationPageNum,
            organizationBoardsPaginationStyles.paginationDelimiter,
          )}
          className={`${stylex.props(organizationBoardsPaginationStyles.paginationPageNum, organizationBoardsPaginationStyles.paginationDelimiter).className} page-num delimiter`}
          data-stylex-owner="organization-boards-pagination-delimiter"
        >
          /
        </li>
        <li
          {...stylex.props(organizationBoardsPaginationStyles.paginationPageNum)}
          className={`${stylex.props(organizationBoardsPaginationStyles.paginationPageNum).className} page-num`}
          data-stylex-owner="organization-boards-pagination-total"
        >
          {pages}
        </li>
        <li
          {...stylex.props(
            organizationBoardsPaginationStyles.paginationPageNum,
            organizationBoardsPaginationStyles.paginationIconPageNum,
          )}
          className={`${stylex.props(organizationBoardsPaginationStyles.paginationPageNum, organizationBoardsPaginationStyles.paginationIconPageNum).className} page-num ikon`}
          data-stylex-owner="organization-boards-pagination-next-page"
        >
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
              <span
                {...stylex.props(organizationBoardsPaginationStyles.paginationIconLabel)}
                data-stylex-owner="organization-boards-pagination-next-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...stylex.props(
                  organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl),
                  organizationBoardsPaginationStyles.paginationNext,
                )}
                className={`${stylex.props(organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl), organizationBoardsPaginationStyles.paginationNext).className} ico btn-pg-next`}
                data-stylex-owner="organization-boards-pagination-next-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span
                {...stylex.props(organizationBoardsPaginationStyles.paginationIconLabelOff)}
                className={`${stylex.props(organizationBoardsPaginationStyles.paginationIconLabelOff).className} off`}
                data-stylex-owner="organization-boards-pagination-next-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...stylex.props(
                  organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl),
                  organizationBoardsPaginationStyles.paginationNext,
                  organizationBoardsPaginationStyles.paginationNextOff,
                )}
                className={`${stylex.props(organizationBoardsPaginationStyles.paginationIcon(legacySpriteUrl), organizationBoardsPaginationStyles.paginationNext, organizationBoardsPaginationStyles.paginationNextOff).className} ico btn-pg-next off`}
                data-stylex-owner="organization-boards-pagination-next-icon"
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
  const rowStyleProps = stylex.props(styles.row);
  const avatarStyleProps = stylex.props(styles.rowAvatar);
  const titleWrapStyleProps = stylex.props(styles.rowTitleWrap);
  const postIdStyleProps = stylex.props(styles.rowPostId);
  const titleStyleProps = stylex.props(styles.title);
  return (
    <li
      {...rowStyleProps}
      className={`${rowStyleProps.className ?? ""} post-item title`.trim()}
      data-stylex-owner="organization-boards-row"
    >
      <Link
        to="/$user"
        params={{ user: post.authorLoginId }}
        {...avatarStyleProps}
        className={`${avatarStyleProps.className ?? ""} avatar-wrap mlarge hide-in-mobile`.trim()}
        data-stylex-owner="organization-boards-row-avatar"
        title={post.authorLoginId}
      >
        <img src={post.authorAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />
      </Link>
      <div
        {...titleWrapStyleProps}
        className={`${titleWrapStyleProps.className ?? ""} title-wrap`.trim()}
        data-stylex-owner="organization-boards-row-title-wrap"
      >
        <Link
          to="/$ownerName/$projectName/post/$postNumber"
          params={{
            ownerName: post.ownerName,
            projectName: post.projectName,
            postNumber: String(post.postNumber),
          }}
          {...titleStyleProps}
          className={`title ${titleStyleProps.className ?? ""}`.trim()}
          data-stylex-owner="organization-boards-title"
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
        <span
          {...postIdStyleProps}
          className={`${postIdStyleProps.className ?? ""} post-id`.trim()}
          data-stylex-owner="organization-boards-row-post-id"
        >
          #{post.postNumber}
        </span>
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
