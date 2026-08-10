/* oxlint-disable jsx-a11y/no-autofocus -- legacy project/list.scala.html sets autofocus on the directory filter input. */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, type SearchSchemaInput, useRouter } from "@tanstack/react-router";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { apiQueryKeys } from "../api/query-keys";
import { restFetch } from "../api/rest-client";
import type { ListProjectsResponse, YoramRecord } from "../api/types";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import "../yobicon-font.css";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";
type ProjectsSearch = {
  filter: string;
  labelIds: number | string;
  pageNum?: number;
};
type ProjectsSearchInput = Partial<ProjectsSearch> & SearchSchemaInput;

const LEGACY_PROJECTS_LINK_SEARCH = {
  filter: undefined,
  labelIds: undefined,
  pageNum: undefined,
};

type ProjectDirectoryItem = YoramRecord & {
  createdLabel?: string;
  createdTitle?: string;
  isForked?: boolean;
  lastPushedLabel?: string;
  logoUrl?: string;
  memberCount?: number;
  members?: YoramRecord[];
  overview?: string;
  originOwnerName?: string;
  originProjectName?: string;
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
  validateSearch: (search: ProjectsSearchInput): ProjectsSearch => {
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
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectsScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
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
      <div className="projects-breadcrumb-outer" data-owner="projects-breadcrumb-outer">
        <div className="projects-breadcrumb-inner" data-owner="projects-breadcrumb-inner">
          <div data-projects-directory-tabs-scope="">
            <ul className="projects-directory-tabs-list" data-owner="projects-directory-tabs-list">
              <li
                data-selected="true"
                className="projects-directory-tabs-item"
                data-owner="projects-directory-tabs-item"
              >
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  search={LEGACY_PROJECTS_LINK_SEARCH}
                  data-owner="projects-directory-tabs-link"
                  to="/projects"
                >
                  {t("project.public")} {t("title.projectList")}
                </Link>
              </li>
              <li
                data-selected="false"
                className="projects-directory-tabs-item"
                data-owner="projects-directory-tabs-item"
              >
                <Link
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  data-owner="projects-directory-tabs-link"
                  to="/orgs"
                >
                  {t("title.organization.list")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="projects-directory-page-wrap" data-owner="projects-directory-page-wrap">
        <div className="projects-directory-page" data-owner="projects-directory-page">
          <div
            className="projects-directory-search-wrap"
            data-owner="projects-directory-search-wrap"
          >
            <div
              className="projects-directory-search-container"
              data-owner="projects-directory-search-container"
              id="search"
            >
              <form
                action={prefixBasePath(runtimeConfig.basePath, "/projects")}
                data-owner="projects-directory-search-form"
                method="get"
              >
                <div
                  className="projects-directory-search-bar"
                  data-owner="projects-directory-search-bar"
                >
                  <input
                    className="projects-directory-search-input"
                    data-owner="projects-directory-search-input"
                    name="filter"
                    type="text"
                    placeholder={t("site.project.filter")}
                    defaultValue={filter}
                    autoFocus
                  />
                  <button
                    className="projects-directory-search-button"
                    data-owner="projects-directory-search-button"
                    type="submit"
                  >
                    <i
                      className="projects-directory-search-icon"
                      data-owner="projects-directory-search-icon"
                    ></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          {projects.length === 0 ? (
            <div data-owner="projects-directory-empty-state">
              <i
                style={
                  {
                    "--projects-directory-empty-state-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="projects-directory-empty-icon"
              ></i>
              <p data-owner="projects-directory-empty-message">{t("project.is.empty")}</p>
            </div>
          ) : (
            <>
              <ul className="projects-directory-list" data-owner="projects-directory-list">
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
  if (totalPages <= 0) {
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
    <div
      className="projects-directory-pagination"
      data-owner="projects-directory-pagination"
      id="pagination"
    >
      <ul
        className="projects-directory-pagination-list"
        data-owner="projects-directory-pagination-list"
      >
        <li
          data-pagination-kind="icon"
          className="projects-directory-pagination-item"
          data-owner="projects-directory-pagination-item"
        >
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
              <i
                style={
                  {
                    "--projects-directory-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-disabled="false"
                className="projects-directory-pagination-prev-icon"
                data-owner="projects-directory-pagination-prev-icon"
              ></i>
              <span
                data-disabled="false"
                className="projects-directory-pagination-label"
                data-owner="projects-directory-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                style={
                  {
                    "--projects-directory-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-disabled="true"
                className="projects-directory-pagination-prev-icon"
                data-owner="projects-directory-pagination-prev-icon"
              ></i>
              <span
                data-disabled="true"
                className="projects-directory-pagination-label"
                data-owner="projects-directory-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li
          data-pagination-kind="standard"
          className="projects-directory-pagination-item"
          data-owner="projects-directory-pagination-item"
        >
          <input
            className="projects-directory-pagination-input"
            data-owner="projects-directory-pagination-input"
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
        <li
          data-pagination-kind="delimiter"
          className="projects-directory-pagination-item"
          data-owner="projects-directory-pagination-item"
        >
          /
        </li>
        <li
          data-pagination-kind="standard"
          className="projects-directory-pagination-item"
          data-owner="projects-directory-pagination-item"
        >
          {totalPages}
        </li>
        <li
          data-pagination-kind="icon"
          className="projects-directory-pagination-item"
          data-owner="projects-directory-pagination-item"
        >
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
              <span
                data-disabled="false"
                className="projects-directory-pagination-label"
                data-owner="projects-directory-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                style={
                  {
                    "--projects-directory-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-disabled="false"
                className="projects-directory-pagination-next-icon"
                data-owner="projects-directory-pagination-next-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span
                data-disabled="true"
                className="projects-directory-pagination-label"
                data-owner="projects-directory-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                style={
                  {
                    "--projects-directory-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-disabled="true"
                className="projects-directory-pagination-next-icon"
                data-owner="projects-directory-pagination-next-icon"
              ></i>
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
  const logoUrl = stringField(project, "logoUrl", "");
  const createdLabel = stringField(project, "createdLabel", "");
  const createdTitle = stringField(project, "createdTitle", createdLabel);
  const lastPushedLabel = stringField(project, "lastPushedLabel", "");
  const isForked = project.isForked === true;
  const originOwnerName = stringField(project, "originOwnerName", "");
  const originProjectName = stringField(project, "originProjectName", "");
  const labels = projectLabels(project);
  const memberCount = numberField(project, "memberCount", 0);
  const members = projectMembers(project);
  const watchCount = numberField(project, "watchCount", 0);

  return (
    <li className="projects-directory-row" data-owner="projects-directory-row">
      <div data-owner="projects-directory-readable-info">
        <div
          className="projects-directory-owner-avatar"
          data-owner="projects-directory-owner-avatar"
        >
          <Link
            to="/$ownerName/$projectName"
            params={{ ownerName, projectName }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={projectName}
                data-owner="projects-directory-owner-avatar-image"
              />
            ) : null}
          </Link>
        </div>
        <div data-owner="projects-directory-readable-identity">
          <div className="projects-directory-header" data-owner="projects-directory-header">
            <Link
              to="/$ownerName/$projectName"
              params={{ ownerName, projectName }}
              className="projects-directory-title-link"
              data-owner="projects-directory-title-link"
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
            >
              {projectName}
            </Link>{" "}
            {isForked && originOwnerName && originProjectName ? (
              <span data-owner="projects-directory-fork-origin">
                <Link
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  data-owner="projects-directory-fork-origin-link"
                  params={{ ownerName: originOwnerName, projectName: originProjectName }}
                  to="/$ownerName/$projectName"
                >
                  <i data-owner="projects-directory-fork-split-icon"></i> {originOwnerName} /{" "}
                  {originProjectName}
                </Link>
              </span>
            ) : null}{" "}
            {stringField(project, "projectScope", "public") === "private" ? (
              <i
                className="projects-directory-private-lock"
                data-owner="projects-directory-private-lock"
              ></i>
            ) : null}{" "}
            {labels.map((label) => {
              const className = label.category ? label.category.toLowerCase() : undefined;
              return (
                <Link
                  activeOptions={{ exact: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className,
                    "data-status": undefined,
                  }}
                  className={className}
                  data-owner="projects-directory-project-label"
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
          </div>
          <div
            className="projects-directory-description"
            data-owner="projects-directory-description"
          >
            {stringField(project, "overview", "")}
          </div>
          <p className="projects-directory-name-tag" data-owner="projects-directory-name-tag">
            {"by "}
            <Link
              to="/$user"
              params={{ user: ownerName }}
              search={{ daysAgo: 14, selected: "issues" }}
              className="projects-directory-owner-link"
              data-owner="projects-directory-owner-link"
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
            >
              {ownerName}
            </Link>
            {" at "}
            <strong title={createdTitle}>{createdLabel}</strong>{" "}
            <span
              className="projects-directory-code-update"
              data-owner="projects-directory-code-update"
            >
              {lastPushedLabel ? (
                <>
                  {`, ${t("project.codeUpdate")} `}
                  <strong>{lastPushedLabel}</strong>
                </>
              ) : null}
            </span>
          </p>
        </div>
      </div>
      {stringField(project, "projectScope", "public") === "public" ? (
        <div className="projects-directory-stats" data-owner="projects-directory-stats">
          <div className="projects-directory-members" data-owner="projects-directory-members">
            <ul
              className="projects-directory-members-list"
              data-owner="projects-directory-members-list"
            >
              {members.map((member) => {
                const loginId = stringField(member, "loginId", "");
                return (
                  <li
                    className="projects-directory-member-item"
                    data-owner="projects-directory-member-item"
                    key={loginId}
                  >
                    <Link
                      activeProps={{
                        "aria-current": undefined,
                        className: undefined,
                        "data-status": undefined,
                      }}
                      className="projects-directory-member-avatar"
                      data-owner="projects-directory-member-avatar"
                      params={{ user: loginId }}
                      to="/$user"
                    >
                      <img
                        alt={stringField(member, "userLabel", "")}
                        data-owner="projects-directory-member-avatar-image"
                        src={stringField(member, "avatarUrl", "")}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p>
              <i
                className="projects-directory-stats-icon"
                data-owner="projects-directory-stats-icon"
              ></i>
              <strong data-owner="projects-directory-member-count">{memberCount}</strong>{" "}
              <i
                className="projects-directory-stats-icon"
                data-owner="projects-directory-stats-icon"
              ></i>{" "}
              <strong data-owner="projects-directory-member-count">{watchCount}</strong>
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

function projectLabels(project: YoramRecord): ProjectDirectoryLabel[] {
  const labels = project.labels;
  if (!Array.isArray(labels)) {
    return [];
  }
  return labels.flatMap((label) => {
    if (!label || typeof label !== "object") {
      return [];
    }
    const record = label as YoramRecord;
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

function projectMembers(project: ProjectDirectoryItem): YoramRecord[] {
  return Array.isArray(project.members)
    ? project.members.filter((member): member is YoramRecord =>
        Boolean(member && typeof member === "object" && stringField(member, "loginId", "")),
      )
    : [];
}

function stringField(record: YoramRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function stringOrNumberField(record: YoramRecord, key: string): string {
  const value = record[key];
  if ((typeof value === "string" || typeof value === "number") && String(value) !== "") {
    return String(value);
  }
  return "";
}

function numberField(record: YoramRecord, key: string, fallback: number): number {
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
  return positiveInteger((payload as YoramRecord)[key]) ?? fallback;
}

function clampPageNum(pageNum: number, totalPages: number) {
  return Math.min(Math.max(pageNum, 1), Math.max(totalPages, 1));
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
