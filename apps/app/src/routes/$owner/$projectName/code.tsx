import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  listRepositoryBranches,
  listRepositoryCommits,
  readProjectRepositoryId,
  readRepositoryFileContent,
} from "@app/lib/repo-browser";

export const Route = createFileRoute("/$owner/$projectName/code")({
  component: ProjectCodeRouteComponent,
});

function ProjectCodeRouteComponent() {
  const params = Route.useParams();
  const isClient = typeof window !== "undefined";
  const [branchInput, setBranchInput] = React.useState("main");
  const [pathInput, setPathInput] = React.useState("README.md");

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

  const commitsQuery = useQuery({
    enabled: isClient && Boolean(repoIdQuery.data),
    queryFn: () =>
      listRepositoryCommits({
        branch: branchInput,
        limit: 20,
        repoId: repoIdQuery.data!,
      }),
    queryKey: ["repo-browser", "commits", repoIdQuery.data, branchInput, 20],
  });

  const fileQuery = useQuery({
    enabled: isClient && Boolean(repoIdQuery.data),
    queryFn: () =>
      readRepositoryFileContent({
        branch: branchInput,
        filePath: pathInput,
        repoId: repoIdQuery.data!,
      }),
    queryKey: ["repo-browser", "file", repoIdQuery.data, branchInput, pathInput],
  });

  const activeBranch = branchesQuery.data?.find((entry) => entry.isHead)?.name ?? branchInput;

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          Code - {params.owner}/{params.projectName}
        </strong>
        <p className="note">Browse branch snapshots and inspect file content.</p>
        <div className="form-grid">
          <label className="field">
            <span>Branch</span>
            <input
              onChange={(event) => setBranchInput(event.target.value)}
              type="text"
              value={branchInput}
            />
          </label>
          <label className="field">
            <span>File path</span>
            <input
              onChange={(event) => setPathInput(event.target.value)}
              type="text"
              value={pathInput}
            />
          </label>
        </div>
        {repoIdQuery.error ? <p className="note error-note">{String(repoIdQuery.error)}</p> : null}
        {branchesQuery.error ? (
          <p className="note error-note">{String(branchesQuery.error)}</p>
        ) : null}
      </article>

      <article className="panel">
        <strong>Branches</strong>
        {branchesQuery.isLoading ? <p className="note">Loading branches...</p> : null}
        {branchesQuery.data?.map((entry) => (
          <p className="note" key={entry.name}>
            {entry.name}
            {entry.isHead ? " (HEAD)" : ""}
          </p>
        ))}
      </article>

      <article className="panel">
        <strong>Recent Commits ({activeBranch})</strong>
        {commitsQuery.isLoading ? <p className="note">Loading commits...</p> : null}
        {commitsQuery.data?.map((entry) => (
          <p className="note" key={entry.oid}>
            <Link
              className="link-text"
              params={{
                oid: entry.oid,
                owner: params.owner,
                projectName: params.projectName,
              }}
              to="/$owner/$projectName/commit/$oid"
            >
              {entry.shortOid}
            </Link>{" "}
            {entry.subject}
          </p>
        ))}
      </article>

      <article className="panel">
        <strong>
          {branchInput}:{pathInput}
        </strong>
        {fileQuery.isLoading ? <p className="note">Loading file...</p> : null}
        {fileQuery.error ? <p className="note error-note">{String(fileQuery.error)}</p> : null}
        {fileQuery.data ? (
          <pre
            className="note"
            style={{ maxHeight: 420, overflow: "auto", whiteSpace: "pre-wrap" }}
          >
            {fileQuery.data.content}
          </pre>
        ) : null}
      </article>
    </section>
  );
}
