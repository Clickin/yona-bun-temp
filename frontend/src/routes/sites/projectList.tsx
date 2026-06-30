import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { siteProjectsQueryOptions, type SiteProject } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type ProjectListSearch = {
  filter: string;
  pageNum: number;
};

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
  const query = useQuery(siteProjectsQueryOptions(runtimeConfig, { filter, page: pageNum }));

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
              <SiteAdminSidebar runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.projectList" />
                </h2>
                <form
                  className="form-search pull-right"
                  action={prefixBasePath(runtimeConfig.basePath, "/sites/projectList")}
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
                    project={project}
                    runtimeConfig={runtimeConfig}
                  />
                ))}
              </ul>

              <div id="pagination"></div>

              <div id="alertDeletionWrap" className="modal fade">
                <div className="modal-header">
                  <button type="button" className="close" data-dismiss="modal">
                    ×
                  </button>
                  <span id="project-name"></span>
                  <LegacyMessage messageKey="site.project.delete" />
                </div>
                <div className="modal-body">
                  <p>
                    <LegacyMessage messageKey="site.project.deleteConfirm" />
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" id="projectDeleteBtn" className="ybtn ybtn-danger">
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button type="button" className="ybtn" data-dismiss="modal">
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

function SiteAdminSidebar({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList", active: true },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massMail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update" },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <a href={prefixBasePath(runtimeConfig.basePath, item.href)}>
            <LegacyMessage messageKey={item.labelKey} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function ProjectListItem({
  project,
  runtimeConfig,
}: {
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
