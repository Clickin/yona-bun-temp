import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type MouseEvent, type SyntheticEvent } from "react";
import type { CSSProperties } from "react";
import {
  deleteSiteProjectRest,
  siteProjectsQueryOptions,
  siteUpdateQueryOptions,
  type SiteProject,
  type SiteProjectListResponse,
} from "../../api/site-admin";
import { apiQueryKeys } from "../../api/query-keys";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import { SiteLayoutShell } from "../-home-route-screen";

type ProjectListSearch = {
  filter?: string;
  pageNum?: number;
};

const legacyProjectListSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };
const legacyLinkSuppressionProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

function insulateProjectDeleteModalClick(event: SyntheticEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export const Route = createFileRoute("/sites/projectList")({
  component: SiteProjectListRoute,
  validateSearch: (search: Record<string, unknown>): ProjectListSearch => ({
    filter:
      typeof search.filter === "string" && search.filter.length > 0 ? search.filter : undefined,
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : undefined,
  }),
});

function SiteProjectListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteProjectListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteProjectListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const routeSearch = Route.useSearch();
  const filter = routeSearch.filter ?? "";
  const pageNum = routeSearch.pageNum;
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteProject, setDeleteProject] = useState<SiteProject | null>(null);
  const [deleteModalClosed, setDeleteModalClosed] = useState(false);
  const currentPage = pageNum ?? 1;
  const projectsQuery = siteProjectsQueryOptions(runtimeConfig, { filter, page: currentPage });
  const query = useQuery(projectsQuery);
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));
  const closeDeletionModal = () => {
    setDeleteModalClosed(true);
    setDeleteProject(null);
  };
  const openDeleteModal = (selectedProject: SiteProject, event: MouseEvent<HTMLButtonElement>) => {
    insulateProjectDeleteModalClick(event);
    setDeleteModalClosed(false);
    setDeleteProject(selectedProject);
  };
  const dismissDeleteModal = (event: SyntheticEvent<HTMLElement>) => {
    insulateProjectDeleteModalClick(event);
    closeDeletionModal();
  };
  const confirmDeleteProject = (event: MouseEvent<HTMLButtonElement>) => {
    insulateProjectDeleteModalClick(event);
    if (deleteProject) {
      deleteMutation.mutate(deleteProject.id);
    }
  };
  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteSiteProjectRest(runtimeConfig, csrfToken, projectId);
    },
    onSuccess(_response, deletedProjectId) {
      let navigateToPreviousPage = false;

      queryClient.setQueryData<SiteProjectListResponse>(projectsQuery.queryKey, (current) => {
        if (!current) {
          return current;
        }

        const nextProjects = current.projects.filter((project) => project.id !== deletedProjectId);
        if (nextProjects.length === current.projects.length) {
          return current;
        }

        const nextTotal = Math.max(0, current.total - 1);
        const nextTotalPages = nextTotal === 0 ? 0 : Math.ceil(nextTotal / current.pageSize);
        navigateToPreviousPage =
          nextProjects.length === 0 && current.page > 1 && nextTotalPages > 0;

        return {
          ...current,
          page: navigateToPreviousPage ? current.page - 1 : current.page,
          projects: nextProjects,
          total: nextTotal,
          totalPages: nextTotalPages,
        };
      });

      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.projectsBase() });
      closeDeletionModal();

      if (navigateToPreviousPage) {
        void router.navigate({
          search: { filter: filter || undefined, pageNum: currentPage - 1 },
          to: "/sites/projectList",
        });
      }
    },
  });

  return (
    <>
      <title>{t("title.projectList")}</title>
      <div data-owner="site-project-list-breadcrumb-outer">
        <div data-owner="site-project-list-breadcrumb-inner">
          <h3 data-owner="site-project-list-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-project-list-page-wrap-outer">
        <div
          className="site-setting-wrap"
          data-owner="site-project-list-setting-wrap"
          data-owner-page="site-project-list-page"
        >
          <div className="row-fluid" data-owner="site-project-list-setting-grid">
            <div className="span2" data-owner="site-project-list-setting-sidebar-column">
              <SiteAdminSidebar
                activeTo="/sites/projectList"
                badgeOwner="site-project-list-notification-badge"
                baseLinkProps={legacyLinkSuppressionProps}
                linkPropsByTo={{ "/sites/projectList": { search: legacyProjectListSidebarSearch } }}
                dataSelected="always"
                navOwner="site-project-list-sidebar-nav"
                ulClassName="site-setting-nav"
                ownerPrefix="site-project-list-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [],
                  activeLink: [],
                  badge: [],
                  firstItem: [],
                  item: [],
                  link: [],
                  nav: [],
                }}
              />
            </div>
            <div className="span10" data-owner="site-project-list-setting-content-column">
              <div data-owner="site-project-list-title-strip">
                <h2 data-owner="site-project-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.projectList" />
                </h2>
                <form
                  className="form-search pull-right"
                  data-owner="site-project-list-search"
                  action={prefixBasePath(runtimeConfig.basePath, "/sites/projectList")}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const nextFilter = String(form.get("filter") ?? "");
                    void queryClient.invalidateQueries({
                      queryKey: apiQueryKeys.siteAdmin.projectsBase(),
                    });
                    void router.navigate({
                      search: { filter: nextFilter || undefined, pageNum: undefined },
                      to: "/sites/projectList",
                    });
                  }}
                >
                  <div className="search-bar" data-owner="site-project-list-search-bar">
                    <input
                      type="text"
                      className="textbox"
                      data-owner="site-project-list-search-textbox"
                      key={filter}
                      name="filter"
                      placeholder={t("site.project.filter")}
                      defaultValue={filter}
                    />
                    <button
                      type="submit"
                      className="search-btn"
                      data-owner="site-project-list-search-button"
                    >
                      <i className="yobicon-search" data-owner="site-project-list-search-icon"></i>
                    </button>
                  </div>
                </form>
              </div>
              <div className="row-fluid listhead" data-owner="site-project-list-listhead">
                <div
                  className="span5 listhead-title"
                  data-owner="site-project-list-listhead-name-column"
                >
                  <strong>
                    <LegacyMessage messageKey="project.name" />
                  </strong>
                </div>
                <div
                  className="span4 listhead-title"
                  data-owner="site-project-list-listhead-description-column"
                >
                  <strong>
                    <LegacyMessage messageKey="project.description" />
                  </strong>
                </div>
                <div
                  className="span2 listhead-title"
                  data-owner="site-project-list-listhead-created-column"
                >
                  <strong>
                    <LegacyMessage messageKey="project.created" />
                  </strong>
                </div>
                <div
                  className="span1 listhead-title"
                  data-owner="site-project-list-listhead-action-column"
                >
                  <strong>&nbsp;</strong>
                </div>
              </div>
              <ul data-owner="site-project-list-container">
                {(query.data?.projects ?? []).map((project, index) => (
                  <ProjectListItem
                    index={index}
                    key={project.id}
                    onDelete={openDeleteModal}
                    project={project}
                  />
                ))}
              </ul>

              <ProjectListPagination
                currentPage={query.data?.page ?? currentPage}
                filter={filter}
                totalPages={query.data?.totalPages ?? 0}
              />

              <div
                id="alertDeletionWrap"
                data-owner="site-project-list-delete-modal"
                aria-hidden={deleteProject ? "false" : deleteModalClosed ? "true" : undefined}
              >
                <div data-owner="site-project-list-delete-modal-header">
                  <button
                    type="button"
                    data-owner="site-project-list-delete-modal-close"
                    onClick={dismissDeleteModal}
                  >
                    ×
                  </button>
                  <span id="project-name">
                    {deleteProject ? `${deleteProject.ownerName}/${deleteProject.projectName}` : ""}
                  </span>
                  <LegacyMessage messageKey="site.project.delete" />
                </div>
                <div data-owner="site-project-list-delete-modal-body">
                  <p>
                    <LegacyMessage messageKey="site.project.deleteConfirm" />
                  </p>
                </div>
                <div data-owner="site-project-list-delete-modal-footer">
                  <button
                    type="button"
                    id="projectDeleteBtn"
                    data-owner="site-project-list-delete-modal-confirm-action"
                    onClick={confirmDeleteProject}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button
                    type="button"
                    data-owner="site-project-list-delete-modal-cancel-action"
                    onClick={dismissDeleteModal}
                  >
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
              {deleteProject ? (
                <div
                  data-owner="site-project-list-delete-modal-backdrop"
                  onClick={dismissDeleteModal}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") dismissDeleteModal(event);
                  }}
                  role="button"
                  tabIndex={-1}
                ></div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ProjectListPagination({
  currentPage,
  filter,
  totalPages,
}: {
  currentPage: number;
  filter: string;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const search = (pageNum: number) => ({
    filter: filter || undefined,
    pageNum,
  });

  return (
    <div className="page-navigation-wrap" data-owner="site-project-list-pagination" id="pagination">
      <ul className="page-nums" data-owner="site-project-list-pagination-list">
        <li
          className="page-num ikon"
          data-pagination-variant="icon"
          data-owner="site-project-list-pagination-item"
        >
          {hasPrev ? (
            <Link
              {...legacyLinkSuppressionProps}
              search={search(currentPage - 1)}
              to="/sites/projectList"
            >
              <i
                className="ico btn-pg-prev"
                data-disabled="false"
                style={
                  {
                    "--site-project-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
              <span data-owner="site-project-list-pagination-label">{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i
                className="ico btn-pg-prev off"
                data-disabled="true"
                data-pagination-state="off"
                style={
                  {
                    "--site-project-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
              <span
                className="off"
                data-pagination-state="off"
                data-owner="site-project-list-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li className="page-num" data-owner="site-project-list-pagination-item">
          <input
            className="input-mini nospinner"
            data-owner="site-project-list-pagination-input"
            key={`${currentPage}-${totalPages}`}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              if (!/^[0-9]+$/.test(event.currentTarget.value)) {
                event.currentTarget.value = String(currentPage);
                return;
              }

              const pageNum = Number(event.currentTarget.value);
              const nextPage = Math.min(Math.max(pageNum, 1), totalPages);
              event.currentTarget.value = String(nextPage);
              void router.navigate({
                search: search(nextPage),
                to: "/sites/projectList",
              });
            }}
            pattern="[0-9]*"
            type="number"
            defaultValue={currentPage}
          />
        </li>
        <li
          className="page-num delimiter"
          data-pagination-variant="delimiter"
          data-owner="site-project-list-pagination-item"
        >
          /
        </li>
        <li className="page-num" data-owner="site-project-list-pagination-item">
          {totalPages}
        </li>
        <li
          className="page-num ikon"
          data-pagination-variant="icon"
          data-owner="site-project-list-pagination-item"
        >
          {hasNext ? (
            <Link
              {...legacyLinkSuppressionProps}
              search={search(currentPage + 1)}
              to="/sites/projectList"
            >
              <span data-owner="site-project-list-pagination-label">{t("button.nextPage")}</span>
              <i
                className="ico btn-pg-next"
                data-disabled="false"
                style={
                  {
                    "--site-project-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
            </Link>
          ) : (
            <>
              <span
                className="off"
                data-pagination-state="off"
                data-owner="site-project-list-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                className="ico btn-pg-next off"
                data-disabled="true"
                data-pagination-state="off"
                style={
                  {
                    "--site-project-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function ProjectListItem({
  index,
  onDelete,
  project,
}: {
  index: number;
  onDelete: (project: SiteProject, event: MouseEvent<HTMLButtonElement>) => void;
  project: SiteProject;
}) {
  const projectLogoUrl = project.projectLogoUrl.trim() || "/assets/images/project_default_logo.png";

  return (
    <li className="row-fluid listitem" data-owner="site-project-list-row">
      <div className="span5 listitem-col" data-owner="site-project-list-row-name-column">
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: project.ownerName, projectName: project.projectName }}
          data-owner="site-project-list-row-avatar"
        >
          <img
            src={projectLogoUrl}
            alt={project.projectName}
            data-owner="site-project-list-row-avatar-image"
          />{" "}
          {project.ownerName}/{project.projectName}
        </Link>
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: project.ownerName, projectName: project.projectName }}
          data-owner="site-project-list-project-name"
        >
          {project.ownerName}/{project.projectName}
        </Link>
      </div>
      <div className="span4 listitem-col" data-owner="site-project-list-row-description-column">
        {project.overview}
      </div>
      <div className="span2 listitem-col" data-owner="site-project-list-row-created-column">
        {project.createdAt}
      </div>
      <div className="span1 listitem-col" data-owner="site-project-list-row-action-column">
        <button
          data-owner="site-project-list-delete-action"
          data-project-name={`${project.ownerName}/${project.projectName}`}
          onClick={(event) => onDelete(project, event)}
        >
          <LegacyMessage messageKey="button.delete" />
        </button>
      </div>
    </li>
  );
}
