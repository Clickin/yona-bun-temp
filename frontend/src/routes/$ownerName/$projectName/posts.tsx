import { useQuery } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  listProjectPostsQueryOptions,
  readProjectPostFormOptionsQueryOptions,
  type BoardLabel,
  type BoardPostListItem,
  type ProjectPostsResponse,
} from "../../../api/boards";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { useLegacyMessages } from "../../../i18n";
import { issueLabelStyle } from "../../../legacy-issue-label-style";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { styles } from "./-posts.stylex";

type ProjectPostsRouteSearch = {
  filter?: string;
  labelIds?: string[];
  orderBy?: string;
  orderDir?: string;
  pageNum?: number;
};

type ProjectPostsSearch = {
  filter: string;
  labelIds: string[];
  orderBy: string;
  orderDir: string;
  pageNum: number;
};

const twoColumnModePopoverStyles = stylex.create({
  popover: {
    bottom: "100%",
    display: "block",
    left: "50%",
    marginBottom: "10px",
    minWidth: "276px",
    pointerEvents: "none",
    position: "absolute",
    transform: "translateX(-50%)",
    zIndex: 1010,
  },
});

type LegacyPostItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };
const legacyRouteLocalActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/$ownerName/$projectName/posts")({
  component: ProjectPostsRoute,
  validateSearch(search: Record<string, unknown>): ProjectPostsRouteSearch {
    const filter = stringSearch(search.filter);
    const labelIds = arraySearch(search.labelIds);
    const orderBy = stringSearch(search.orderBy);
    const orderDir = stringSearch(search.orderDir);
    const pageNum = Number(search.pageNum) || 0;
    return {
      ...(filter ? { filter } : {}),
      ...(labelIds.length > 0 ? { labelIds } : {}),
      ...(orderBy && orderBy !== "updatedDate" ? { orderBy } : {}),
      ...(orderDir && orderDir !== "desc" ? { orderDir } : {}),
      ...(pageNum > 1 ? { pageNum } : {}),
    };
  },
});

function ProjectPostsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectPostsScreen runtimeConfig={runtimeConfig} />;
}

function ProjectPostsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const routeSearch = Route.useSearch();
  const search: ProjectPostsSearch = {
    filter: routeSearch.filter ?? "",
    labelIds: routeSearch.labelIds ?? [],
    orderBy: routeSearch.orderBy ?? "updatedDate",
    orderDir: routeSearch.orderDir ?? "desc",
    pageNum: routeSearch.pageNum ?? 1,
  };
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const postsQuery = useQuery(
    listProjectPostsQueryOptions(runtimeConfig, { ownerName, projectName, ...search }),
  );
  const optionsQuery = useQuery(
    readProjectPostFormOptionsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !postsQuery.data || !optionsQuery.data) {
    return null;
  }

  return (
    <ProjectPostsBody
      labels={optionsQuery.data.labels}
      posts={postsQuery.data}
      project={projectQuery.data}
      runtimeConfig={runtimeConfig}
      search={search}
    />
  );
}

function ProjectPostsBody({
  labels,
  posts,
  project,
  runtimeConfig,
  search,
}: {
  labels: BoardLabel[];
  posts: ProjectPostsResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
  search: ProjectPostsSearch;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, posts.ownerName);
  const projectName = stringField(project.projectName, posts.projectName);
  const action = projectPostsHref(runtimeConfig.basePath, ownerName, projectName);
  const hasPosts = posts.notices.length > 0 || posts.items.length > 0;
  const router = useRouter();
  const [hoveredTitlePrefix, setHoveredTitlePrefix] = useState("");
  const handleTitlePrefixSearch = (filter: string) => {
    router.history.push(
      boardListHref(runtimeConfig.basePath, ownerName, projectName, {
        ...search,
        filter,
        pageNum: 1,
      }),
    );
  };

  return (
    <div className="page-wrap-outer" data-stylex-owner="project-posts-page">
      <div className="post-list project-page-wrap" data-stylex-owner="project-posts-list">
        <div className="search-wrap underline">
          <form
            id="option_form"
            action={action}
            method="get"
            className={`${stylex.props(styles.search).className} pull-left`}
            data-stylex-owner="project-posts-search"
          >
            <input type="hidden" name="orderBy" value={search.orderBy} />
            <input type="hidden" name="orderDir" value={search.orderDir} />
            <div className="search-bar">
              <input
                key={search.filter}
                name="filter"
                className="textbox"
                type="text"
                placeholder={t("project.searchPlaceholder")}
                defaultValue={search.filter}
              />
              <button type="submit" className="search-btn">
                <i className="yobicon-search"></i>
              </button>
            </div>
            {labels.length > 0 ? (
              <BoardLabels
                labels={labels}
                ownerName={ownerName}
                projectName={projectName}
                search={search}
              />
            ) : null}
            <TwoColumnModeCheckbox />
          </form>
          <div className="pull-right">
            <Link
              to="/$ownerName/$projectName/postform"
              params={{ ownerName, projectName }}
              search={{}}
              activeProps={legacyRouteLocalActiveProps}
              className="ybtn ybtn-success"
            >
              {t("post.write")}
            </Link>
          </div>
        </div>

        {!hasPosts ? (
          <div className="error-wrap">
            <i className="ico ico-err1"></i>
            <p>{t("post.is.empty")}</p>
          </div>
        ) : (
          <>
            {posts.totalCount > 1 ? (
              <BoardFilters ownerName={ownerName} projectName={projectName} search={search} />
            ) : null}
            {posts.notices.length > 0 ? (
              <ul className="post-list-wrap notice-wrap" data-stylex-owner="project-posts-notices">
                {posts.notices.map((post) => (
                  <ProjectBoardPost
                    basePath={runtimeConfig.basePath}
                    hoveredTitlePrefix={hoveredTitlePrefix}
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    onTitlePrefixHover={setHoveredTitlePrefix}
                    onTitlePrefixSearch={handleTitlePrefixSearch}
                    post={post}
                  />
                ))}
              </ul>
            ) : null}
            <ul className="post-list-wrap" data-stylex-owner="project-posts-items">
              {posts.items.map((post) => (
                <ProjectBoardPost
                  basePath={runtimeConfig.basePath}
                  hoveredTitlePrefix={hoveredTitlePrefix}
                  key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                  onTitlePrefixHover={setHoveredTitlePrefix}
                  onTitlePrefixSearch={handleTitlePrefixSearch}
                  post={post}
                />
              ))}
            </ul>
          </>
        )}

        <div className="write-btn-wrap"></div>
        <BoardPagination
          basePath={runtimeConfig.basePath}
          ownerName={ownerName}
          posts={posts}
          projectName={projectName}
          search={search}
        />
        <BoardListKeymap project={project} />
      </div>
    </div>
  );
}

function BoardLabels({
  labels,
  ownerName,
  projectName,
  search,
}: {
  labels: BoardLabel[];
  ownerName: string;
  projectName: string;
  search: ProjectPostsSearch;
}) {
  const { t } = useLegacyMessages();
  const labelGroups = groupLabels(labels);

  return (
    <div className="board-labels">
      <dl className="">
        <dt>
          {t("label")}{" "}
          <Link
            to="/$ownerName/$projectName/issue/labelsform"
            params={{ ownerName, projectName }}
            activeProps={legacyRouteLocalActiveProps}
            target="_blank"
            className="label-edit"
          >
            [{t("button.edit")}]
          </Link>
        </dt>
        <dd>
          <select
            id="labelIds"
            name="labelIds"
            multiple
            data-format="issuelabel"
            data-allow-clear="true"
            data-dropdown-css-class="issue-labels"
            data-container-css-class="issue-labels bordered fullsize"
            data-placeholder={t("label.select")}
            className="hide"
            defaultValue={search.labelIds}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option></option>
            {labelGroups.map((group) => (
              <optgroup
                label={group.categoryName}
                data-category-id={group.categoryId}
                data-category-exclusive={String(group.categoryIsExclusive)}
                key={group.categoryId}
              >
                {group.labels.map((label) => (
                  <option
                    value={label.id}
                    data-category-id={label.categoryId}
                    data-category-exclusive={String(label.categoryIsExclusive)}
                    key={label.id}
                  >
                    {label.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </dd>
      </dl>
    </div>
  );
}

function groupLabels(labels: BoardLabel[]) {
  const groups = new Map<
    string,
    {
      categoryId: string;
      categoryIsExclusive: boolean;
      categoryName: string;
      labels: BoardLabel[];
    }
  >();
  for (const label of labels) {
    const group = groups.get(label.categoryId) ?? {
      categoryId: label.categoryId,
      categoryIsExclusive: label.categoryIsExclusive,
      categoryName: label.categoryName,
      labels: [],
    };
    group.labels.push(label);
    groups.set(label.categoryId, group);
  }
  return Array.from(groups.values());
}

function BoardFilters({
  ownerName,
  projectName,
  search,
}: {
  ownerName: string;
  projectName: string;
  search: ProjectPostsSearch;
}) {
  const { t } = useLegacyMessages();
  const filters = [
    { field: "updatedDate", label: t("common.order.updatedDate") },
    { field: "createdDate", label: t("common.order.date") },
    { field: "numOfComments", label: t("common.order.comments") },
  ];

  return (
    <div
      className={`${stylex.props(styles.filterWrap).className ?? ""} filter-wrap board`.trim()}
      data-stylex-owner="project-posts-filter-wrap"
    >
      <div
        className={`${stylex.props(styles.filters).className ?? ""} filters`.trim()}
        data-stylex-owner="project-posts-filters"
      >
        {filters.map((filter, index) => {
          const active = search.orderBy === filter.field;
          const nextDir = active && search.orderDir === "desc" ? "asc" : "desc";
          const filterStyleProps = stylex.props(
            styles.filter,
            index === filters.length - 1 && styles.filterLast,
            active && styles.filterActive,
          );
          return (
            <Link
              to={boardListHref("", ownerName, projectName, {
                ...search,
                orderBy: filter.field,
                orderDir: active ? nextDir : "desc",
              })}
              activeProps={legacyRouteLocalActiveProps}
              className={`${filterStyleProps.className ?? ""} filter${active ? " active" : ""}`.trim()}
              data-stylex-owner="project-posts-filter"
              key={filter.field}
            >
              <i
                className={`${stylex.props(styles.filterIcon).className ?? ""} ico btn-gray-arrow ${
                  !active || search.orderDir === "desc" ? " down " : ""
                }`.trim()}
                data-stylex-owner="project-posts-filter-icon"
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
  basePath,
  ownerName,
  posts,
  projectName,
  search,
}: {
  basePath: string;
  ownerName: string;
  posts: ProjectPostsResponse;
  projectName: string;
  search: ProjectPostsSearch;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const totalPages = Math.ceil(posts.totalCount / Math.max(posts.pageSize, 1));
  if (totalPages <= 1) {
    return <div id="pagination"></div>;
  }

  const currentPage = clampPage(posts.pageNum, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (pageNum: number) => ({ ...search, pageNum });
  const navigateToPage = (pageNum: number) => {
    router.history.push(boardListHref(basePath, ownerName, projectName, pageSearch(pageNum)));
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

    const nextPage = clampPage(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(nextPage);
    navigateToPage(nextPage);
  };

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              to={boardListHref("", ownerName, projectName, pageSearch(currentPage - 1))}
              activeProps={legacyRouteLocalActiveProps}
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
            type="number"
            pattern="[0-9]*"
            className="input-mini nospinner"
            name="pageNum"
            max={totalPages}
            min={1}
            defaultValue={currentPage}
            key={`${currentPage}-${totalPages}`}
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={handleInputKeyDown}
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              to={boardListHref("", ownerName, projectName, pageSearch(currentPage + 1))}
              activeProps={legacyRouteLocalActiveProps}
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

function ProjectBoardPost({
  basePath,
  hoveredTitlePrefix,
  onTitlePrefixHover,
  onTitlePrefixSearch,
  post,
}: {
  basePath: string;
  hoveredTitlePrefix: string;
  onTitlePrefixHover: (prefix: string) => void;
  onTitlePrefixSearch: (filter: string) => void;
  post: BoardPostListItem;
}) {
  const { t } = useLegacyMessages();
  const titleParts = splitHeaderWordsInBrackets(post.title);
  const postRoutePath = `/${post.ownerName}/${post.projectName}/post/${post.postNumber}`;
  const authorRoutePath = `/${post.authorLoginId}`;
  const postHref = prefixBasePath(basePath, postRoutePath);
  const legacyPostItemAttrs = {
    className: "post-item title",
    href: postHref,
  } satisfies LegacyPostItemAttrs;

  return (
    <li {...legacyPostItemAttrs} data-stylex-owner="project-posts-item">
      <Link
        to={authorRoutePath}
        activeProps={legacyRouteLocalActiveProps}
        className="avatar-wrap mlarge hide-in-mobile"
        title={post.authorLoginId}
      >
        <img
          src={
            post.authorAvatarUrl || prefixBasePath(basePath, "/assets/images/default-avatar-32.png")
          }
          alt=""
          width="32"
          height="32"
        />
      </Link>
      <div className="title-wrap">
        {post.notice ? (
          <>
            <span className="label label-notice">{t("post.notice")}</span>{" "}
          </>
        ) : null}
        {!post.readme ? <span className="post-id">{post.postNumber}</span> : null}
        {post.readme ? <span className="label label-important">README</span> : null}
        {titleParts.prefixes.map((prefix) => (
          <LegacyTitlePrefixButton
            active={hoveredTitlePrefix === prefix}
            key={prefix}
            onTitlePrefixHover={onTitlePrefixHover}
            onTitlePrefixSearch={onTitlePrefixSearch}
          >
            {prefix}
          </LegacyTitlePrefixButton>
        ))}
        <Link to={postRoutePath} activeProps={legacyRouteLocalActiveProps} className="title">
          {titleParts.title}
        </Link>
      </div>
      <div className="infos">
        {post.authorLabel ? (
          <Link
            to={authorRoutePath}
            activeProps={legacyRouteLocalActiveProps}
            className="infos-item infos-link-item"
            title={post.authorLoginId}
          >
            {post.authorLabel}
          </Link>
        ) : (
          <span className="infos-item">{t("issue.noAuthor")}</span>
        )}
        <span className="infos-item" title={post.createdLabel}>
          {post.createdLabel}
        </span>
        <span className="infos-item item-count-groups">
          <Link to={postRoutePath} hash="comments" activeProps={legacyRouteLocalActiveProps}>
            <span className="count-groups item-icon ">
              <i className="yobicon-comments"></i>
            </span>
            <span className="count-groups item-count ">{post.commentCount}</span>
          </Link>
        </span>
        {post.labels.map((label) => {
          // API-provided label paint uses Dynamic StyleX carriers; literal inline declarations stay retired.
          const paint = issueLabelStyle(label.color);
          const labelPaint = paint
            ? stylex.props(
                styles.labelPaint(
                  String(paint.backgroundColor ?? ""),
                  String(paint.boxShadow ?? ""),
                  String(paint.color ?? ""),
                ),
              )
            : undefined;
          return (
            <button
              type="button"
              {...(labelPaint ?? {})}
              className={`label issue-label list-label active ${stylex.props(styles.labelButtonReset, styles.labelList).className ?? ""} ${labelPaint?.className ?? ""}`.trim()}
              data-category-id={label.categoryId}
              data-label-id={label.id}
              data-stylex-owner="project-posts-label-button"
              key={label.id}
            >
              {label.name}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function LegacyTitlePrefixButton({
  active,
  children,
  onTitlePrefixHover,
  onTitlePrefixSearch,
}: {
  active: boolean;
  children: string;
  onTitlePrefixHover: (prefix: string) => void;
  onTitlePrefixSearch: (filter: string) => void;
}) {
  const submitTitlePrefixSearch = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onTitlePrefixSearch(children);
  };
  return (
    <button
      type="button"
      className={active ? "title-prefix title-prefix-hover" : "title-prefix"}
      onClick={submitTitlePrefixSearch}
      onMouseEnter={() => onTitlePrefixHover(children)}
      onMouseLeave={() => onTitlePrefixHover("")}
    >
      {children}
    </button>
  );
}

function splitHeaderWordsInBrackets(title: string) {
  const prefixes: string[] = [];
  const pattern = /^\s*(\[[^\]]+\])/u;
  let rest = title;
  while (true) {
    const match = pattern.exec(rest);
    if (!match) {
      break;
    }
    prefixes.push(match[1].trim());
    rest = rest.slice(match[0].length);
  }
  const onlyPrefixes = rest.trim() === "";
  return {
    prefixes: onlyPrefixes ? [] : prefixes,
    title: onlyPrefixes ? title : rest.trimStart(),
  };
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
      className={`${stylex.props(styles.twoColumnMode).className} two-column-icon mr10 hide-in-mobile`}
      data-stylex-owner="project-posts-two-column-mode"
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
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
        <div
          className={`${stylex.props(twoColumnModePopoverStyles.popover).className} popover top`.trim()}
          data-stylex-owner="project-posts-two-column-popover"
          role="tooltip"
        >
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

function BoardListKeymap({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const [isOpen, setIsOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("macintosh");
  const ctrlKey = isMac ? "⌘" : "CTRL";
  const showPullRequest = stringField((project as Record<string, unknown>).vcs, "GIT") === "GIT";
  const showProjectSetting = booleanField((project as Record<string, unknown>).viewerCanUpdate);
  const modalClassName = isOpen ? "modal fade keymap-help in" : "modal hide fade keymap-help";
  const keymapOpenStyleProps = isOpen ? stylex.props(styles.keymapOpen) : undefined;
  const closeModal = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(false);
  };

  return (
    <div
      className={`${stylex.props(styles.keymap).className} pull-left`}
      data-stylex-owner="project-posts-keymap"
    >
      <button
        type="button"
        className="ybtn ybtn-inverse ybtn-mini"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        {t("title.keymap")}
      </button>
      <div
        id="helpKeys"
        {...keymapOpenStyleProps}
        className={`${modalClassName} ${keymapOpenStyleProps?.className ?? ""}`.trim()}
        data-stylex-owner="project-posts-keymap-modal"
        tabIndex={-1}
        role="dialog"
        onKeyUp={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        <div className="row-fluid">
          <div className="span3">
            <h5>{t("project.projects")}</h5>
            <KeymapEntry keys={["H"]} label={t("menu.home")} />
            <KeymapEntry keys={["B"]} label={t("menu.board")} />
            <KeymapEntry keys={["I"]} label={t("menu.issue")} />
            <KeymapEntry keys={["C"]} label={t("menu.code")} />
            <KeymapEntry keys={["M"]} label={t("milestone")} />
            {showPullRequest ? <KeymapEntry keys={["P"]} label={t("menu.pullRequest")} /> : null}
            {showProjectSetting ? <KeymapEntry keys={["Q"]} label={t("project.setting")} /> : null}
          </div>
          <div className="span9">
            <div className="row-fluid">
              <div className="span5">
                <h5>{t("title.boardList")}</h5>
                <KeymapEntry keys={["N"]} label={t("post.write")} />
                <KeymapEntry keys={["←"]} label={t("button.prevPage")} />
                <KeymapEntry keys={["→"]} label={t("button.nextPage")} />
              </div>
              <div className="span7">
                <h5>{t("site")}</h5>
                <KeymapEntry keys={["A"]} label={t("issue.myIssue")} />
                <KeymapEntry keys={["U"]} label={t("userinfo.profile")} />
                <KeymapEntry keys={["F"]} label={t("user.menu")} />
                <KeymapEntry
                  keys={isMac ? ["CTRL", "ALT", "S"] : ["ALT", "S"]}
                  label={t("site.search")}
                />
                <KeymapEntry keys={[ctrlKey, "ENTER"]} label={t("button.submitForm")} />
              </div>
            </div>
            <div className="row-fluid mt20">
              <div className="span12"></div>
            </div>
          </div>
        </div>
        <p className="actrow">
          <button type="button" className="ybtn ybtn-info" onClick={closeModal}>
            {t("button.confirm")}
          </button>
        </p>
      </div>
      {isOpen ? (
        <div className="modal-backdrop fade in" role="presentation" onClick={closeModal}></div>
      ) : null}
    </div>
  );
}

function KeymapEntry({ keys, label }: { keys: string[]; label: string }) {
  return (
    <>
      {keys.map((key) => (
        <Fragment key={key}>
          {key === keys[0] ? "" : " + "}
          <span className="ybtn ybtn-small">{key}</span>
        </Fragment>
      ))}
      <span className="help-inline">{label}</span>
      <br />
    </>
  );
}

function boardListHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  search: ProjectPostsSearch,
) {
  const queryEntries: [string, string][] = [["pageNum", String(search.pageNum)]];
  if (search.filter) {
    queryEntries.push(["filter", search.filter]);
  }
  queryEntries.push(...search.labelIds.map((labelId): [string, string] => ["labelIds", labelId]));
  queryEntries.push(["orderBy", search.orderBy], ["orderDir", search.orderDir]);
  const query = new URLSearchParams(queryEntries);
  return `${projectPostsHref(basePath, ownerName, projectName)}?${query.toString()}`;
}

function projectPostsHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}/posts`);
}

function arraySearch(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const normalized = String(item);
      return normalized ? [normalized] : [];
    });
  }
  if ((typeof value === "string" || typeof value === "number") && String(value) !== "") {
    return [String(value)];
  }
  return [];
}

function stringSearch(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function stringField(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown): boolean {
  return value === true;
}

function clampPage(pageNum: number, totalPages: number) {
  return Math.min(Math.max(pageNum, 1), totalPages);
}
