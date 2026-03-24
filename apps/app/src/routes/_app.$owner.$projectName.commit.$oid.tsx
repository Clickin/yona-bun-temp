import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { useTranslate } from "@app/lib/i18n-react";
import { readProjectDetail } from "@app/lib/project";
import { readProjectRepositoryId, readRepositoryCommitDetail } from "@app/lib/repo-browser";

export const Route = createFileRoute("/_app/$owner/$projectName/commit/$oid")({
  loader: ({ params }) =>
    readProjectDetail({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectCommitDetailRouteComponent,
});

function ProjectCommitDetailRouteComponent() {
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

  const commitQuery = useQuery({
    enabled: isClient && Boolean(repoIdQuery.data),
    queryFn: () =>
      readRepositoryCommitDetail({
        oid: params.oid,
        repoId: repoIdQuery.data!,
      }),
    queryKey: ["repo-browser", "commit", repoIdQuery.data, params.oid],
  });

  return (
    <ProjectShell
      activeMenu="code"
      aside={
        <SidebarSection title={t("app.project.repositoryLinks")}>
          <p className="sidebar-kv">OID: {params.oid}</p>
          <div className="sidebar-link-list">
            <Link
              className="sidebar-link"
              params={{ owner: params.owner, projectName: params.projectName }}
              to="/$owner/$projectName/code"
            >
              {t("app.project.backToCodeBrowser")}
            </Link>
          </div>
        </SidebarSection>
      }
      project={project}
    >
      <ContentCard title={t("app.project.commitDetail")}>
        {repoIdQuery.error ? <p className="note error-note">{String(repoIdQuery.error)}</p> : null}
        {commitQuery.error ? <p className="note error-note">{String(commitQuery.error)}</p> : null}
        {commitQuery.isLoading ? <p className="note">{t("app.project.loadingCommit")}</p> : null}
        {commitQuery.data ? (
          <>
            <p className="note">
              <strong>{commitQuery.data.shortOid}</strong> {commitQuery.data.subject}
            </p>
            <p className="note">
              {commitQuery.data.authorName} ({commitQuery.data.authorEmail})
            </p>
            <pre className="note">{commitQuery.data.body || t("app.project.noCommitBody")}</pre>
          </>
        ) : null}
      </ContentCard>
    </ProjectShell>
  );
}
