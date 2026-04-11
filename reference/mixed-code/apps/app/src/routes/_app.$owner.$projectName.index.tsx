import { Link, createFileRoute } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { readProjectDetail } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/")({
  loader: ({ params }) =>
    readProjectDetail({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectDetailRouteComponent,
});

function ProjectDetailRouteComponent() {
  const data = Route.useLoaderData();
  const t = useTranslate();

  return (
    <ProjectShell
      activeMenu="home"
      aside={
        <>
          <SidebarSection title={t("app.project.visibility")}>
            <p className="sidebar-kv">{t("app.project.currentScope", data.projectScope)}</p>
            <p className="sidebar-kv">{t("app.project.ownerType", data.organizationName ? t("app.project.organizationManaged") : t("app.project.userManaged"))}</p>
          </SidebarSection>
          <SidebarSection title={t("app.project.quickAccess")}>
            <div className="sidebar-link-list">
              <Link
                className="sidebar-link"
                params={{ owner: data.ownerName, projectName: data.projectName }}
                to="/$owner/$projectName/code"
              >
                {t("app.project.browseCode")}
              </Link>
              <Link
                className="sidebar-link"
                params={{ owner: data.ownerName, projectName: data.projectName }}
                to="/$owner/$projectName/issues"
              >
                {t("app.project.viewIssues")}
              </Link>
              <Link
                className="sidebar-link"
                params={{ owner: data.ownerName, projectName: data.projectName }}
                to="/$owner/$projectName/discussions"
              >
                {t("app.project.openDiscussions")}
              </Link>
            </div>
          </SidebarSection>
        </>
      }
      project={data}
    >
      <ContentCard title={t("app.project.overview")}>
        <p className="note">{data.overview ?? t("app.project.noOverview")}</p>
        <div className="link-row">
          <Link
            className="link-text"
            params={{ owner: data.ownerName, projectName: data.projectName }}
            to="/$owner/$projectName/discussions"
          >
            {t("menu.board")}
          </Link>
          <Link
            className="link-text"
            params={{ owner: data.ownerName, projectName: data.projectName }}
            to="/$owner/$projectName/pulls"
          >
            {t("menu.pullRequest")}
          </Link>
        </div>
      </ContentCard>
      {data.viewerCanUpdate ? (
        <ContentCard title={t("app.project.managerActions")}>
          <div className="link-row">
            <Link
              className="link-text"
              params={{ owner: data.ownerName, projectName: data.projectName }}
              to="/$owner/$projectName/settings"
            >
              {t("app.project.editSettings")}
            </Link>
            <Link
              className="link-text"
              params={{ owner: data.ownerName, projectName: data.projectName }}
              to="/$owner/$projectName/branches"
            >
              {t("app.project.reviewBranches")}
            </Link>
          </div>
        </ContentCard>
      ) : null}
    </ProjectShell>
  );
}
