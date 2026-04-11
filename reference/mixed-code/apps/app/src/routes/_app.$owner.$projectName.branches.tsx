import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { useTranslate } from "@app/lib/i18n-react";
import { readProjectDetail } from "@app/lib/project";
import { listRepositoryBranches, readProjectRepositoryId } from "@app/lib/repo-browser";

export const Route = createFileRoute("/_app/$owner/$projectName/branches")({
  loader: ({ params }) =>
    readProjectDetail({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectBranchesRouteComponent,
});

function ProjectBranchesRouteComponent() {
  const params = Route.useParams();
  const project = Route.useLoaderData();
  const isClient = typeof window !== "undefined";
  const t = useTranslate();

  const repoIdQuery = useQuery({
    enabled: isClient,
    queryFn: () =>
      readProjectRepositoryId({
        ownerName: params.owner,
        projectName: params.projectName,
      }),
    queryKey: ["repo-browser", "repo-id", params.owner, params.projectName],
  });

  const branchesQuery = useQuery({
    enabled: isClient && Boolean(repoIdQuery.data),
    queryFn: () => listRepositoryBranches({ repoId: repoIdQuery.data! }),
    queryKey: ["repo-browser", "branches", repoIdQuery.data],
  });

  return (
    <ProjectShell
      activeMenu="branches"
      aside={
        <SidebarSection title={t("app.project.repositoryLinks")}>
          <div className="sidebar-link-list">
            <Link
              className="sidebar-link"
              params={{ owner: params.owner, projectName: params.projectName }}
              to="/$owner/$projectName/code"
            >
              {t("app.project.openCodeBrowser")}
            </Link>
          </div>
        </SidebarSection>
      }
      project={project}
    >
      <ContentCard title={t("app.project.branchList")}>
        {branchesQuery.isLoading ? <p className="note">{t("app.project.loadingBranches")}</p> : null}
        {repoIdQuery.error ? <p className="note error-note">{String(repoIdQuery.error)}</p> : null}
        {branchesQuery.error ? <p className="note error-note">{String(branchesQuery.error)}</p> : null}
        {branchesQuery.data?.map((entry) => (
          <p className="note" key={entry.name}>
            {entry.name}
            {entry.isHead ? ` (${t("app.project.head")})` : ""} - {entry.oid.slice(0, 7)}
          </p>
        ))}
      </ContentCard>
    </ProjectShell>
  );
}
