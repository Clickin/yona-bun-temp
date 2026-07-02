import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";
import {
  deleteSiteProjectRest,
  siteProjectsQueryOptions,
  siteUpdateQueryOptions,
  type SiteProject,
} from "../../api/site-admin";
import { apiQueryKeys } from "../../api/query-keys";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type ProjectListSearch = {
  filter: string;
  pageNum: number;
};

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    activeProps?: { className?: string | undefined };
    children?: ReactNode;
    search?: Record<string, number | string | undefined>;
    to: string;
  }
>;

export const Route = createFileRoute("/sites/projectList")({
  component: SiteProjectListRoute,
  validateSearch: (search: Record<string, unknown>): ProjectListSearch => ({
    filter: typeof search.filter === "string" ? search.filter : "",
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : 1,
  }),
});

function SiteProjectListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteProjectListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteProjectListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { filter, pageNum } = Route.useSearch();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteProject, setDeleteProject] = useState<SiteProject | null>(null);
  const [deleteModalClosed, setDeleteModalClosed] = useState(false);
  const query = useQuery(siteProjectsQueryOptions(runtimeConfig, { filter, page: pageNum }));
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));
  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteSiteProjectRest(runtimeConfig, csrfToken, projectId);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.projectsBase() });
    },
  });

  return (
    <>
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
                      search: { filter: nextFilter, pageNum: 1 },
                      to: "/sites/projectList",
                    });
                  }}
                >
                  <div className="search-bar">
                    <input
                      type="text"
                      className="textbox"
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
                    onDelete={(selectedProject) => {
                      setDeleteModalClosed(false);
                      setDeleteProject(selectedProject);
                    }}
                    project={project}
                    runtimeConfig={runtimeConfig}
                  />
                ))}
              </ul>

              <ProjectListPagination
                currentPage={query.data?.page ?? pageNum}
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
                    onClick={() => {
                      setDeleteModalClosed(true);
                      setDeleteProject(null);
                    }}
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
                    onClick={() => {
                      if (deleteProject) {
                        deleteMutation.mutate(deleteProject.id);
                      }
                      setDeleteModalClosed(true);
                      setDeleteProject(null);
                    }}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button
                    type="button"
                    className="ybtn"
                    data-dismiss="modal"
                    onClick={() => {
                      setDeleteModalClosed(true);
                      setDeleteProject(null);
                    }}
                  >
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
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
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              search={search(currentPage - 1)}
              to="/sites/projectList"
              {...{ "pjax-page": "" }}
            >
              <i className="ico btn-pg-prev"></i>
              <span>PREV</span>
            </LegacyInternalLink>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">PREV</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            readOnly
            type="number"
            value={currentPage}
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              search={search(currentPage + 1)}
              to="/sites/projectList"
              {...{ "pjax-page": "" }}
            >
              <span>NEXT</span>
              <i className="ico btn-pg-next"></i>
            </LegacyInternalLink>
          ) : (
            <>
              <span className="off">NEXT</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList", active: true },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update", badge: showUpdateBadge },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <LegacyInternalLink activeProps={{ className: undefined }} to={item.href}>
            <LegacyMessage messageKey={item.labelKey} />
            {item.badge ? <span className="notification-badge">1</span> : null}
          </LegacyInternalLink>
        </li>
      ))}
    </ul>
  );
}

function ProjectListItem({
  onDelete,
  project,
  runtimeConfig,
}: {
  onDelete: (project: SiteProject) => void;
  project: SiteProject;
  runtimeConfig: RuntimeConfig;
}) {
  const projectPath = prefixBasePath(
    runtimeConfig.basePath,
    `/${project.ownerName}/${project.projectName}`,
  );

  return (
    <li className="row-fluid listitem">
      <div className="span5 listitem-col">
        <a href={projectPath} className="avatar-wrap list-avatar">
          <img src={project.projectLogoUrl} alt={project.projectName} /> {project.ownerName}/
          {project.projectName}
        </a>
        <a href={projectPath} className="project-name">
          {project.ownerName}/{project.projectName}
        </a>
      </div>
      <div className="span4 listitem-col">{project.overview}</div>
      <div className="span2 listitem-col">{project.createdAt}</div>
      <div className="span1 listitem-col">
        <button
          className="ybtn ybtn-danger"
          data-project-name={`${project.ownerName}/${project.projectName}`}
          data-toggle="delete-project"
          data-href={prefixBasePath(runtimeConfig.basePath, `/sites/project/delete/${project.id}`)}
          onClick={() => onDelete(project)}
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
