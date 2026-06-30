import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type LiHTMLAttributes } from "react";
import {
  listProjectPostsQueryOptions,
  readProjectPostFormOptionsQueryOptions,
  type BoardLabel,
  type BoardPostListItem,
  type ProjectPostsResponse,
} from "../../../api/boards";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type ProjectPostsSearch = {
  filter: string;
  labelIds: string[];
  orderBy: string;
  orderDir: string;
  pageNum: number;
};

export const Route = createFileRoute("/$ownerName/$projectName/posts")({
  component: ProjectPostsRoute,
  validateSearch(search: Record<string, unknown>): ProjectPostsSearch {
    return {
      filter: stringSearch(search.filter),
      labelIds: arraySearch(search.labelIds),
      orderBy: stringSearch(search.orderBy, "updatedDate"),
      orderDir: stringSearch(search.orderDir, "desc"),
      pageNum: Number(search.pageNum) || 1,
    };
  },
});

function ProjectPostsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPostsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPostsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
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
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="board" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectPostsBody
        labels={optionsQuery.data.labels}
        posts={postsQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </>
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

  return (
    <div className="page-wrap-outer">
      <div className="post-list project-page-wrap">
        <div className="search-wrap underline">
          <form id="option_form" action={action} method="get" className="pull-left">
            <input type="hidden" name="orderBy" value={search.orderBy} />
            <input type="hidden" name="orderDir" value={search.orderDir} />
            <div className="search-bar">
              <input
                name="filter"
                className="textbox"
                type="text"
                placeholder={t("title.search")}
                defaultValue={search.filter}
              />
              <button type="submit" className="search-btn">
                <i className="yobicon-search"></i>
              </button>
            </div>
            {labels.length > 0 ? (
              <BoardLabels
                basePath={runtimeConfig.basePath}
                labels={labels}
                ownerName={ownerName}
                projectName={projectName}
                search={search}
              />
            ) : null}
            <TwoColumnModeCheckbox />
          </form>
          <div className="pull-right">
            <a
              href={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/postform`)}
              className="ybtn ybtn-success"
            >
              {t("post.write")}
            </a>
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
              <BoardFilters
                basePath={runtimeConfig.basePath}
                ownerName={ownerName}
                projectName={projectName}
                search={search}
              />
            ) : null}
            {posts.notices.length > 0 ? (
              <ul className="post-list-wrap notice-wrap">
                {posts.notices.map((post) => (
                  <ProjectBoardPost
                    basePath={runtimeConfig.basePath}
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    post={post}
                  />
                ))}
              </ul>
            ) : null}
            <ul className="post-list-wrap">
              {posts.items.map((post) => (
                <ProjectBoardPost
                  basePath={runtimeConfig.basePath}
                  key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                  post={post}
                />
              ))}
            </ul>
          </>
        )}

        <div className="write-btn-wrap"></div>
        <div id="pagination"></div>
      </div>
    </div>
  );
}

function BoardLabels({
  basePath,
  labels,
  ownerName,
  projectName,
  search,
}: {
  basePath: string;
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
          <a
            href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labelsform`)}
            target="_blank"
            className="label-edit"
          >
            [{t("button.edit")}]
          </a>
        </dt>
        <dd>
          <select
            id="labelIds"
            name="labelIds"
            multiple
            data-search="labelIds"
            data-toggle="select2"
            data-format="issuelabel"
            data-allow-clear="true"
            data-dropdown-css-class="issue-labels"
            data-container-css-class="issue-labels bordered fullsize"
            data-placeholder={t("label.select")}
            className="hide"
            defaultValue={search.labelIds}
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
  basePath,
  ownerName,
  projectName,
  search,
}: {
  basePath: string;
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
    <div className="filter-wrap board">
      <div className="filters">
        {filters.map((filter) => {
          const active = search.orderBy === filter.field;
          const nextDir = active && search.orderDir === "desc" ? "asc" : "desc";
          return (
            <a
              href={boardListHref(basePath, ownerName, projectName, {
                ...search,
                orderBy: filter.field,
                orderDir: active ? nextDir : "desc",
              })}
              className={active ? "filter active" : "filter"}
              key={filter.field}
            >
              <i
                className={`ico btn-gray-arrow ${
                  !active || search.orderDir === "desc" ? " down " : ""
                }`}
              ></i>
              {filter.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ProjectBoardPost({ basePath, post }: { basePath: string; post: BoardPostListItem }) {
  const { t } = useLegacyMessages();
  const titleParts = splitHeaderWordsInBrackets(post.title);
  const postHref = `${projectPostsHref(basePath, post.ownerName, post.projectName).replace(
    /\/posts$/u,
    "",
  )}/post/${post.postNumber}`;
  const authorHref = prefixBasePath(basePath, `/${post.authorLoginId}`);
  const legacyHref = { href: postHref } as unknown as LiHTMLAttributes<HTMLLIElement>;

  return (
    <li className="post-item title" {...legacyHref}>
      <a
        href={authorHref}
        className="avatar-wrap mlarge hide-in-mobile"
        data-toggle="tooltip"
        data-placement="bottom"
        title={post.authorLoginId}
      >
        <img
          src={post.authorAvatarUrl || "/assets/images/default-avatar-32.png"}
          alt=""
          width="32"
          height="32"
        />
      </a>
      <div className="title-wrap">
        {post.notice ? (
          <>
            <span className="label label-notice">{t("post.notice")}</span>{" "}
          </>
        ) : null}
        {!post.readme ? <span className="post-id">{post.postNumber}</span> : null}
        {post.readme ? <span className="label label-important">README</span> : null}
        {titleParts.prefixes.map((prefix) => (
          <LegacyTitlePrefixAnchor key={prefix}>{prefix}</LegacyTitlePrefixAnchor>
        ))}
        <a href={postHref} className="title">
          {titleParts.title}
        </a>
      </div>
      <div className="infos">
        {post.authorLabel ? (
          <a
            href={authorHref}
            className="infos-item infos-link-item"
            data-toggle="tooltip"
            data-placement="bottom"
            title={post.authorLoginId}
          >
            {post.authorLabel}
          </a>
        ) : (
          <span className="infos-item">{t("issue.noAuthor")}</span>
        )}
        <span
          className="infos-item"
          data-toggle="tooltip"
          data-placement="bottom"
          title={post.createdLabel}
        >
          {post.createdLabel}
        </span>
        <span className="infos-item item-count-groups">
          <a href={`${postHref}#comments`}>
            <span className="count-groups item-icon ">
              <i className="yobicon-comments"></i>
            </span>
            <span className="count-groups item-count ">{post.commentCount}</span>
          </a>
        </span>
        {post.labels.map((label) => (
          // oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy board labels render inert filter anchors.
          <a
            href="#"
            className="label issue-label list-label active"
            data-category-id={label.categoryId}
            data-label-id={label.id}
            key={label.id}
          >
            {label.name}
          </a>
        ))}
      </div>
    </li>
  );
}

function LegacyTitlePrefixAnchor({ children }: { children: string }) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    anchorRef.current?.setAttribute("href", "javascript:void(0)");
  }, []);
  return (
    <a ref={anchorRef} href="/" className="title-prefix">
      {children}
    </a>
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
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">{t("common.two.column.view")}</span>
        </div>
      </label>
    </div>
  );
}

function boardListHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  search: ProjectPostsSearch,
) {
  const query = new URLSearchParams();
  query.set("pageNum", String(search.pageNum));
  if (search.filter) {
    query.set("filter", search.filter);
  }
  for (const labelId of search.labelIds) {
    query.append("labelIds", labelId);
  }
  query.set("orderBy", search.orderBy);
  query.set("orderDir", search.orderDir);
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
