/* oxlint-disable jsx-a11y/no-autofocus -- legacy project/list.scala.html sets autofocus on the directory filter input. */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { apiQueryKeys } from "../api/query-keys";
import { restFetch } from "../api/rest-client";
import type { ListProjectsResponse, YonaRecord } from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type ProjectsSearch = {
  filter: string;
  labelIds: number | string;
  pageNum?: number;
};

type ProjectDirectoryItem = YonaRecord & {
  createdLabel?: string;
  createdTitle?: string;
  lastPushedLabel?: string;
  logoUrl?: string;
  memberCount?: number;
  overview?: string;
  ownerName?: string;
  projectName?: string;
  projectScope?: string;
  watchCount?: number;
};

type ProjectDirectoryLabel = {
  category: string;
  id: string;
  name: string;
};

export const Route = createFileRoute("/projects")({
  component: ProjectsRoute,
  validateSearch: (search: Record<string, unknown>): ProjectsSearch => {
    const pageNum = positiveInteger(search.pageNum);
    return {
      filter: typeof search.filter === "string" ? search.filter : "",
      labelIds: stringSearch(search.labelIds),
      ...(pageNum ? { pageNum } : {}),
    };
  },
});

function ProjectsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectsScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const search = Route.useSearch();
  const { filter } = search;
  const { t } = useLegacyMessages();
  const projectsQuery = useQuery(projectsDirectoryQueryOptions(runtimeConfig, search));
  const projects = projectItems(projectsQuery.data);
  const totalPages = positiveIntegerField(projectsQuery.data, "totalPages", 1);
  const responsePage = positiveIntegerField(
    projectsQuery.data,
    "pageNum",
    positiveIntegerField(projectsQuery.data, "page", 1),
  );
  const currentPage = clampPageNum(search.pageNum ?? responsePage, totalPages);

  return (
    <SiteLayoutShell activeMenu="projects" runtimeConfig={runtimeConfig}>
      <title>{t("title.projectList")}</title>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li className="active">
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  to="/projects"
                >
                  {t("project.public")} {t("title.projectList")}
                </Link>
              </li>
              <li>
                <Link
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  to="/orgs"
                >
                  {t("title.organization.list")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="search-wrap">
            <div id="search" className="pull-left">
              <form action={prefixBasePath(runtimeConfig.basePath, "/projects")} method="get">
                <div className="search-bar">
                  <input
                    name="filter"
                    className="textbox"
                    type="text"
                    placeholder={t("site.project.filter")}
                    defaultValue={filter}
                    autoFocus
                  />
                  <button type="submit" className="search-btn">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          {projects.length === 0 ? (
            <div className="error-wrap">
              <i className="ico ico-err1"></i>
              <p>{t("project.is.empty")}</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {projects.map((project) => (
                  <ProjectListItem
                    key={`${project.ownerName ?? ""}/${project.projectName ?? ""}`}
                    basePath={runtimeConfig.basePath}
                    project={project}
                  />
                ))}
              </ul>
              <ProjectsPagination
                currentPage={currentPage}
                filter={filter}
                labelIds={String(search.labelIds)}
                totalPages={totalPages}
              />
            </>
          )}
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function ProjectsPagination({
  currentPage,
  filter,
  labelIds,
  totalPages,
}: {
  currentPage: number;
  filter: string;
  labelIds: string;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  if (totalPages <= 1) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (pageNum: number) => ({
    ...(filter ? { filter } : {}),
    ...(labelIds ? { labelIds: labelIdSearchValue(labelIds) } : {}),
    pageNum,
  });
  const navigateToPage = (pageNum: number) => {
    void router.navigate({
      search: pageSearch(pageNum),
      to: "/projects",
    });
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^[0-9]+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }
    const value = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(value);
    navigateToPage(value);
  };

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              search={pageSearch(currentPage - 1)}
              to="/projects"
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
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleInputKeyDown}
            pattern="[0-9]*"
            type="number"
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
              search={pageSearch(currentPage + 1)}
              to="/projects"
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

function ProjectListItem({
  basePath,
  project,
}: {
  basePath: string;
  project: ProjectDirectoryItem;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const ownerName = stringField(project, "ownerName", "");
  const projectName = stringField(project, "projectName", "");
  if (!projectIsReadable(project)) {
    return (
      <li className="project" style={{ backgroundColor: "#fcfcfc" }}>
        <div className="info-wrap" style={{ opacity: 0.3 }}>
          <div className="owner-avatar-wrap">
            <img
              src={prefixBasePath(basePath, "/assets/images/project_default_logo.png")}
              alt={projectName}
            />
          </div>
          <div style={{ float: "left", color: "gray" }}>
            You do not have permission to view this project's information
          </div>
        </div>
      </li>
    );
  }

  const logoUrl = stringField(project, "logoUrl", "/assets/images/project_default_logo.png");
  const createdLabel = stringField(project, "createdLabel", "");
  const createdTitle = stringField(project, "createdTitle", createdLabel);
  const lastPushedLabel = stringField(project, "lastPushedLabel", "");
  const labels = projectLabels(project);
  const memberCount = numberField(project, "memberCount", 0);
  const watchCount = numberField(project, "watchCount", 0);

  return (
    <li className="project">
      <div className="info-wrap">
        <div className="owner-avatar-wrap">
          <Link
            to="/$ownerName/$projectName"
            params={{ ownerName, projectName }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
          >
            <img src={logoUrl} alt={projectName} />
          </Link>
        </div>
        <div style={{ float: "left" }}>
          <div className="header">
            <Link
              to="/$ownerName/$projectName"
              params={{ ownerName, projectName }}
              className="black"
              activeProps={{
                "aria-current": undefined,
                className: "black",
                "data-status": undefined,
              }}
            >
              {projectName}
            </Link>
            {labels.map((label) => {
              const className = label.category
                ? `project-label ${label.category.toLowerCase()}`
                : "project-label";
              return (
                <Link
                  activeOptions={{ exact: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className,
                    "data-status": undefined,
                  }}
                  className={className}
                  key={label.id}
                  onClick={(event) => {
                    event.preventDefault();
                    router.history.push(
                      prefixBasePath(
                        basePath,
                        `/projects?labelIds=${encodeURIComponent(label.id)}`,
                      ),
                    );
                  }}
                  search={{ labelIds: labelIdSearchValue(label.id) }}
                  to="/projects"
                >
                  {label.name}
                </Link>
              );
            })}
            {stringField(project, "projectScope", "public") === "private" ? (
              <i className="yobicon-lock yobicon-small"></i>
            ) : null}
          </div>
          <div className="desc">{stringField(project, "overview", "")}</div>
          <p className="name-tag">
            by{" "}
            <Link
              to="/$user"
              params={{ user: ownerName }}
              className="owner-name-small"
              activeProps={{
                "aria-current": undefined,
                className: "owner-name-small",
                "data-status": undefined,
              }}
            >
              {ownerName}
            </Link>{" "}
            at <strong title={createdTitle}>{createdLabel}</strong>{" "}
            {lastPushedLabel ? (
              <span className="small-font">
                , {t("project.codeUpdate")} <strong>{lastPushedLabel}</strong>
              </span>
            ) : null}
          </p>
        </div>
      </div>
      {stringField(project, "projectScope", "public") === "public" ? (
        <div className="stats-wrap pull-right">
          <div className="members">
            <ul className="unstyled"></ul>
            <p>
              <i className="yobicon-friends yobicon-middle"></i>
              <strong>{memberCount}</strong> <i className="yobicon-eye yobicon-middle"></i>{" "}
              <strong>{watchCount}</strong>
            </p>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function projectItems(payload: unknown): ProjectDirectoryItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as { items?: unknown; projects?: unknown };
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.projects)
      ? record.projects
      : [];
  return items.filter((item): item is ProjectDirectoryItem =>
    Boolean(item && typeof item === "object"),
  );
}

function projectLabels(project: YonaRecord): ProjectDirectoryLabel[] {
  const labels = project.labels;
  if (!Array.isArray(labels)) {
    return [];
  }
  return labels.flatMap((label) => {
    if (!label || typeof label !== "object") {
      return [];
    }
    const record = label as YonaRecord;
    const id = stringOrNumberField(record, "id");
    const name = stringField(record, "name", "");
    if (!id || !name) {
      return [];
    }
    return [
      {
        category: stringField(record, "category", stringField(record, "categoryName", "")),
        id,
        name,
      },
    ];
  });
}

function stringField(record: YonaRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function stringOrNumberField(record: YonaRecord, key: string): string {
  const value = record[key];
  if ((typeof value === "string" || typeof value === "number") && String(value) !== "") {
    return String(value);
  }
  return "";
}

function numberField(record: YonaRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" ? value : fallback;
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^[0-9]+$/u.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function stringSearch(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : "";
  }
  if ((typeof value === "string" || typeof value === "number") && String(value) !== "") {
    return String(value);
  }
  return "";
}

function labelIdSearchValue(value: string): number | string {
  return /^[0-9]+$/u.test(value) ? Number.parseInt(value, 10) : value;
}

function positiveIntegerField(payload: unknown, key: string, fallback: number): number {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return positiveInteger((payload as YonaRecord)[key]) ?? fallback;
}

function clampPageNum(pageNum: number, totalPages: number) {
  return Math.min(Math.max(pageNum, 1), Math.max(totalPages, 1));
}

function projectIsReadable(record: YonaRecord): boolean {
  for (const key of ["viewerCanRead", "canRead", "isReadable", "readable"]) {
    if (record[key] === false) {
      return false;
    }
  }
  return true;
}

type ProjectsDirectoryQueryInput = {
  filter: string;
  labelIds: string;
  pageNum?: number;
};

function projectsDirectoryQueryOptions(runtimeConfig: RuntimeConfig, search: ProjectsSearch) {
  const input = projectsDirectoryQueryInput(search);
  return queryOptions({
    queryFn: () => listProjectsDirectoryRest(runtimeConfig, input),
    queryKey: [...apiQueryKeys.project.list(), input] as const,
  });
}

function projectsDirectoryQueryInput(search: ProjectsSearch): ProjectsDirectoryQueryInput {
  const pageNum = positiveInteger(search.pageNum);
  return {
    filter: search.filter,
    labelIds: stringSearch(search.labelIds),
    ...(pageNum ? { pageNum } : {}),
  };
}

function listProjectsDirectoryRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectsDirectoryQueryInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectsResponse> {
  return restFetch<ListProjectsResponse>(runtimeConfig, projectsDirectoryPath(input), {
    fetchImpl,
    method: "GET",
  });
}

function projectsDirectoryPath(input: ProjectsDirectoryQueryInput): string {
  const params = new URLSearchParams();
  if (input.filter) {
    params.set("filter", input.filter);
  }
  if (input.labelIds) {
    params.set("labelIds", input.labelIds);
  }
  if (input.pageNum) {
    params.set("pageNum", String(input.pageNum));
  }
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}
