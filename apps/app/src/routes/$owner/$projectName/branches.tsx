import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { listRepositoryBranches, readProjectRepositoryId } from "@app/lib/repo-browser";

export const Route = createFileRoute("/$owner/$projectName/branches")({
  component: ProjectBranchesRouteComponent,
});

function ProjectBranchesRouteComponent() {
  const params = Route.useParams();
  const isClient = typeof window !== "undefined";

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
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          Branches - {params.owner}/{params.projectName}
        </strong>
        <p className="note">Repository branches for this project.</p>
      </article>

      <article className="panel">
        <strong>Branch List</strong>
        {branchesQuery.isLoading ? <p className="note">Loading branches...</p> : null}
        {repoIdQuery.error ? <p className="note error-note">{String(repoIdQuery.error)}</p> : null}
        {branchesQuery.error ? (
          <p className="note error-note">{String(branchesQuery.error)}</p>
        ) : null}
        {branchesQuery.data?.map((entry) => (
          <p className="note" key={entry.name}>
            {entry.name}
            {entry.isHead ? " (HEAD)" : ""} - {entry.oid.slice(0, 7)}
          </p>
        ))}
        <div className="link-row">
          <Link
            className="link-text"
            params={{ owner: params.owner, projectName: params.projectName }}
            to="/$owner/$projectName/code"
          >
            Open code browser
          </Link>
        </div>
      </article>
    </section>
  );
}
