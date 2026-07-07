import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";
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
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type ProjectListSearch = {
  filter?: string;
  pageNum?: number;
};

const legacyLinkSuppressionProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

function insulateProjectDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteProjectListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
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
    insulateProjectDeleteModalButtonClick(event);
    setDeleteModalClosed(false);
    setDeleteProject(selectedProject);
  };
  const dismissDeleteModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateProjectDeleteModalButtonClick(event);
    closeDeletionModal();
  };
  const confirmDeleteProject = (event: MouseEvent<HTMLButtonElement>) => {
    insulateProjectDeleteModalButtonClick(event);
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
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.projectList" />
                </h2>
                <form
                  className="form-search pull-right"
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
                  <div className="search-bar">
                    <input
                      type="text"
                      className="textbox"
                      key={filter}
                      name="filter"
                      placeholder={t("site.project.filter")}
                      defaultValue={filter}
                    />
                    <button type="submit" className="search-btn">
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </form>
              </div>
              <div className="row-fluid listhead">
                <div className="span5 listhead-title">
                  <strong>
                    <LegacyMessage messageKey="project.name" />
                  </strong>
                </div>
                <div className="span4 listhead-title">
                  <strong>
                    <LegacyMessage messageKey="project.description" />
                  </strong>
                </div>
                <div className="span2 listhead-title">
                  <strong>
                    <LegacyMessage messageKey="project.created" />
                  </strong>
                </div>
                <div className="span1 listhead-title">
                  <strong>&nbsp;</strong>
                </div>
              </div>
              <ul className="project-list-wrap">
                {(query.data?.projects ?? []).map((project) => (
                  <ProjectListItem
                    key={project.id}
                    onDelete={openDeleteModal}
                    project={project}
                    runtimeConfig={runtimeConfig}
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
                className={
                  deleteProject
                    ? "modal fade in"
                    : deleteModalClosed
                      ? "modal fade hide"
                      : "modal fade"
                }
                style={deleteProject ? { display: "block" } : undefined}
              >
                <div className="modal-header">
                  <button
                    type="button"
                    className="close"
                    data-dismiss="modal"
                    onClick={dismissDeleteModal}
                  >
                    ×
                  </button>
                  <span id="project-name">
                    {deleteProject ? `${deleteProject.ownerName}/${deleteProject.projectName}` : ""}
                  </span>
                  <LegacyMessage messageKey="site.project.delete" />
                </div>
                <div className="modal-body">
                  <p>
                    <LegacyMessage messageKey="site.project.deleteConfirm" />
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    id="projectDeleteBtn"
                    className="ybtn ybtn-danger"
                    onClick={confirmDeleteProject}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button
                    type="button"
                    className="ybtn"
                    data-dismiss="modal"
                    onClick={dismissDeleteModal}
                  >
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
              {deleteProject ? <div className="modal-backdrop fade in"></div> : null}
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
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              {...legacyLinkSuppressionProps}
              pjax-page=""
              search={search(currentPage - 1)}
              to="/sites/projectList"
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
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              {...legacyLinkSuppressionProps}
              pjax-page=""
              search={search(currentPage + 1)}
              to="/sites/projectList"
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

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="active">
        <Link {...legacyLinkSuppressionProps} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/diagnostic">
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function ProjectListItem({
  onDelete,
  project,
  runtimeConfig,
}: {
  onDelete: (project: SiteProject, event: MouseEvent<HTMLButtonElement>) => void;
  project: SiteProject;
  runtimeConfig: RuntimeConfig;
}) {
  const projectLogoUrl = project.projectLogoUrl.trim() || "/assets/images/project_default_logo.png";

  return (
    <li className="row-fluid listitem">
      <div className="span5 listitem-col">
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: project.ownerName, projectName: project.projectName }}
          className="avatar-wrap list-avatar"
        >
          <img src={projectLogoUrl} alt={project.projectName} /> {project.ownerName}/
          {project.projectName}
        </Link>
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: project.ownerName, projectName: project.projectName }}
          className="project-name"
        >
          {project.ownerName}/{project.projectName}
        </Link>
      </div>
      <div className="span4 listitem-col">{project.overview}</div>
      <div className="span2 listitem-col">{project.createdAt}</div>
      <div className="span1 listitem-col">
        <button
          className="ybtn ybtn-danger"
          data-project-name={`${project.ownerName}/${project.projectName}`}
          data-toggle="delete-project"
          data-href={prefixBasePath(runtimeConfig.basePath, `/sites/project/delete/${project.id}`)}
          onClick={(event) => onDelete(project, event)}
        >
          <LegacyMessage messageKey="button.delete" />
        </button>
      </div>
    </li>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
