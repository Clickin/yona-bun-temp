import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  listOrganizationBoardsQueryOptions,
  type BoardPostListItem,
  type OrganizationBoardsResponse,
} from "../../../api/boards";
import type { LiHTMLAttributes } from "react";
import { readOrganizationContainerRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

type OrganizationBoardsSearch = {
  filter: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  projectNames: string[];
};

export const Route = createFileRoute("/organizations/$organizationName/boards")({
  component: OrganizationBoardsRoute,
  validateSearch(search: Record<string, unknown>): OrganizationBoardsSearch {
    return {
      filter: stringSearch(search.filter),
      orderBy: stringSearch(search.orderBy, "updatedDate"),
      orderDir: stringSearch(search.orderDir, "desc"),
      pageNum: Number(search.pageNum) || 1,
      projectNames: arraySearch(search.projectNames),
    };
  },
});

function OrganizationBoardsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationBoardsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
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
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const hasPosts = boards.items.length > 0;

  return (
    <>
      <OrganizationHeader
        basePath={runtimeConfig.basePath}
        logoUrl={logoUrl}
        organizationName={organizationName}
      />
      <OrganizationMenu
        active="boards"
        basePath={runtimeConfig.basePath}
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
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
                  data-toggle="select2"
                  data-container-css-class="fullsize"
                  defaultValue={search.projectNames}
                >
                  {boards.visibleProjects.map((project) => {
                    const projectName = project.projectName;
                    return (
                      <option
                        value={projectName}
                        data-avatar-url="/assets/images/project_default_logo.png"
                        key={projectName}
                      >
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
                <BoardFilters
                  basePath={runtimeConfig.basePath}
                  organizationName={organizationName}
                  search={search}
                />
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
          <div id="pagination"></div>
        </div>
      </div>
    </>
  );
}

function BoardFilters({
  basePath,
  organizationName,
  search,
}: {
  basePath: string;
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
            <a
              href={boardListHref(basePath, organizationName, {
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

function OrganizationBoardPost({ basePath, post }: { basePath: string; post: BoardPostListItem }) {
  const projectHref = prefixBasePath(basePath, `/${post.ownerName}/${post.projectName}`);
  const postHref = `${projectHref}/post/${post.postNumber}`;
  const authorHref = prefixBasePath(basePath, `/${post.authorLoginId}`);
  const legacyHref = { href: postHref } as unknown as LiHTMLAttributes<HTMLLIElement>;

  return (
    <li className="post-item title" {...legacyHref}>
      <a
        href={authorHref}
        className="avatar-wrap mlarge hide-in-mobile"
        data-toggle="tooltip"
        data-placement="top"
        title={post.authorLoginId}
      >
        <img src={post.authorAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />
      </a>
      <div className="title-wrap">
        <a href={postHref} className="title">
          {post.title}
        </a>
      </div>
      <div className="infos">
        {post.authorLabel ? (
          <a
            href={authorHref}
            className="infos-item infos-link-item"
            data-toggle="tooltip"
            data-placement="top"
            title={post.authorLoginId}
          >
            {post.authorLabel}
          </a>
        ) : (
          <span className="infos-item">No author</span>
        )}
        <a href={projectHref} className="infos-link-item group-project-name">
          {post.projectName}
        </a>
        <span className="post-id">#{post.postNumber}</span>
        <span className="infos-item" title={post.createdLabel}>
          {post.createdLabel}
        </span>
        {post.commentCount > 0 ? (
          <span className="infos-item item-count-groups">
            <a href={`${postHref}#comments`}>
              <span className="count-groups item-icon ">
                <i className="yobicon-comments"></i>
              </span>
              <span className="count-groups item-count ">{post.commentCount}</span>
            </a>
          </span>
        ) : null}
      </div>
    </li>
  );
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

function OrganizationHeader({
  basePath,
  logoUrl,
  organizationName,
}: {
  basePath: string;
  logoUrl: string;
  organizationName: string;
}) {
  return (
    <div className="project-header-outer" style={{ backgroundImage: `url('${logoUrl}')` }}>
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className="project-breadcrumb-wrap">
            <div className="project-breadcrumb">
              <span className="project-author">
                <span className="group-title-head">group</span>
                <a href={organizationHref(basePath, organizationName)}>{organizationName}</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationMenu({
  active,
  basePath,
  organizationName,
  viewerCanUpdate,
}: {
  active: "boards";
  basePath: string;
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className="">
            <a href={organizationHref(basePath, organizationName)}>{t("title.organizationHome")}</a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/issues`)}>
              {t("menu.issue")}
            </a>
          </li>
          <li className={active === "boards" ? "active" : ""}>
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/boards`)}>
              {t("menu.board")}
            </a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/pullrequests`)}>
              {t("menu.pullRequest")}
            </a>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <a
                  href={prefixBasePath(basePath, `/organizations/${organizationName}/settingform`)}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function boardListHref(
  basePath: string,
  organizationName: string,
  search: OrganizationBoardsSearch,
) {
  const params = new URLSearchParams();
  params.set("orderBy", search.orderBy);
  params.set("orderDir", search.orderDir);
  if (search.filter) {
    params.set("filter", search.filter);
  }
  search.projectNames.forEach((projectName) => params.append("projectNames", projectName));
  return `${prefixBasePath(basePath, `/organizations/${organizationName}/boards`)}?${params.toString()}`;
}

function organizationHref(basePath: string, organizationName: string) {
  return prefixBasePath(basePath, `/organizations/${organizationName}`);
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

function booleanField(value: unknown) {
  return value === true;
}
