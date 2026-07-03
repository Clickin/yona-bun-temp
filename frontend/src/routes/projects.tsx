import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listProjectsQueryOptions } from "../api/org-project";
import type { YonaRecord } from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type ProjectsSearch = {
  filter: string;
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

export const Route = createFileRoute("/projects")({
  component: ProjectsRoute,
  validateSearch: (search: Record<string, unknown>): ProjectsSearch => ({
    filter: typeof search.filter === "string" ? search.filter : "",
  }),
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
  const { filter } = Route.useSearch();
  const { t } = useLegacyMessages();
  const projectsQuery = useQuery(listProjectsQueryOptions(runtimeConfig));
  const projects = projectItems(projectsQuery.data);
  const autofocusRef = (node: HTMLInputElement | null) => {
    node?.setAttribute("autofocus", "");
  };

  return (
    <SiteLayoutShell activeMenu="projects" runtimeConfig={runtimeConfig}>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li className="active">
                <a href={prefixBasePath(runtimeConfig.basePath, "/projects")}>
                  {t("project.public")} {t("title.projectList")}
                </a>
              </li>
              <li>
                <a href={prefixBasePath(runtimeConfig.basePath, "/orgs")}>
                  {t("title.organization.list")}
                </a>
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
                    ref={autofocusRef}
                    name="filter"
                    className="textbox"
                    type="text"
                    placeholder={t("site.project.filter")}
                    defaultValue={filter}
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
                    project={project}
                  />
                ))}
              </ul>
              <div id="pagination"></div>
            </>
          )}
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function ProjectListItem({ project }: { project: ProjectDirectoryItem }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project, "ownerName", "");
  const projectName = stringField(project, "projectName", "");
  const logoUrl = stringField(project, "logoUrl", "/assets/images/project_default_logo.png");
  const createdLabel = stringField(project, "createdLabel", "");
  const createdTitle = stringField(project, "createdTitle", createdLabel);
  const lastPushedLabel = stringField(project, "lastPushedLabel", "");
  const memberCount = numberField(project, "memberCount", 0);
  const watchCount = numberField(project, "watchCount", 0);

  return (
    <li className="project">
      <div className="info-wrap">
        <div className="owner-avatar-wrap">
          <Link
            to="/$ownerName/$projectName"
            params={{ ownerName, projectName }}
            activeProps={{ className: undefined }}
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
              activeProps={{ className: undefined }}
            >
              {projectName}
            </Link>
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
              activeProps={{ className: undefined }}
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

function stringField(record: YonaRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberField(record: YonaRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" ? value : fallback;
}
