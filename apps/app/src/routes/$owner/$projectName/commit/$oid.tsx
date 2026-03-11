import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { readProjectRepositoryId, readRepositoryCommitDetail } from "@app/lib/repo-browser";

export const Route = createFileRoute("/$owner/$projectName/commit/$oid")({
  component: ProjectCommitDetailRouteComponent,
});

function ProjectCommitDetailRouteComponent() {
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
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          Commit - {params.owner}/{params.projectName}
        </strong>
        <p className="note">OID: {params.oid}</p>
        <div className="link-row">
          <Link
            className="link-text"
            params={{ owner: params.owner, projectName: params.projectName }}
            to="/$owner/$projectName/code"
          >
            Back to code browser
          </Link>
        </div>
      </article>

      <article className="panel">
        <strong>Commit Detail</strong>
        {repoIdQuery.error ? <p className="note error-note">{String(repoIdQuery.error)}</p> : null}
        {commitQuery.error ? <p className="note error-note">{String(commitQuery.error)}</p> : null}
        {commitQuery.isLoading ? <p className="note">Loading commit...</p> : null}
        {commitQuery.data ? (
          <>
            <p className="note">
              <strong>{commitQuery.data.shortOid}</strong> {commitQuery.data.subject}
            </p>
            <p className="note">
              {commitQuery.data.authorName} ({commitQuery.data.authorEmail})
            </p>
            <pre
              className="note"
              style={{ maxHeight: 420, overflow: "auto", whiteSpace: "pre-wrap" }}
            >
              {commitQuery.data.body || "(no body)"}
            </pre>
          </>
        ) : null}
      </article>
    </section>
  );
}
