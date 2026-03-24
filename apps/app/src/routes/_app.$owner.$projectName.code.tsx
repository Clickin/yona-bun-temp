import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { useTranslate } from "@app/lib/i18n-react";
import { readProjectDetail } from "@app/lib/project";
import {
  listRepositoryBranches,
  listRepositoryCommits,
  readProjectRepositoryId,
  readRepositoryFileContent,
} from "@app/lib/repo-browser";

export const Route = createFileRoute("/_app/$owner/$projectName/code")({
  loader: ({ params }) =>
    readProjectDetail({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectCodeRouteComponent,
});

function ProjectCodeRouteComponent() {
  const params = Route.useParams();
  const project = Route.useLoaderData();
  const isClient = typeof window !== "undefined";
  const t = useTranslate();
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
    <ProjectShell
      activeMenu="code"
      aside={
        <>
          <SidebarSection title={t("app.project.browseRepository")}>
            <div className="form-grid">
              <label className="field">
                <span>{t("app.project.branches")}</span>
                <input onChange={(event) => setBranchInput(event.target.value)} type="text" value={branchInput} />
              </label>
              <label className="field">
                <span>{t("app.project.filePath")}</span>
                <input onChange={(event) => setPathInput(event.target.value)} type="text" value={pathInput} />
              </label>
            </div>
            {repoIdQuery.error ? <p className="note error-note">{String(repoIdQuery.error)}</p> : null}
            {branchesQuery.error ? <p className="note error-note">{String(branchesQuery.error)}</p> : null}
          </SidebarSection>
          <SidebarSection title={t("app.project.branches")}>
            {branchesQuery.isLoading ? <p className="note">{t("app.project.loadingBranches")}</p> : null}
            {branchesQuery.data?.map((entry) => (
              <p className="note" key={entry.name}>
                {entry.name}
                {entry.isHead ? ` (${t("app.project.head")})` : ""}
              </p>
            ))}
          </SidebarSection>
        </>
      }
      project={project}
    >
      <ContentCard title={t("app.project.recentCommits", activeBranch)}>
        {commitsQuery.isLoading ? <p className="note">{t("app.project.loadingCommits")}</p> : null}
        {commitsQuery.data?.map((entry) => (
          <p className="note" key={entry.oid}>
            <Link
              className="link-text"
              params={{ oid: entry.oid, owner: params.owner, projectName: params.projectName }}
              to="/$owner/$projectName/commit/$oid"
            >
              {entry.shortOid}
            </Link>{" "}
            {entry.subject}
          </p>
        ))}
      </ContentCard>

      <ContentCard title={`${branchInput}:${pathInput}`}>
        {fileQuery.isLoading ? <p className="note">{t("app.project.loadingFile")}</p> : null}
        {fileQuery.error ? <p className="note error-note">{String(fileQuery.error)}</p> : null}
        {fileQuery.data ? <pre className="note">{fileQuery.data.content}</pre> : null}
      </ContentCard>
    </ProjectShell>
  );
}
