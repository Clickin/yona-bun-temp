import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { codeCompareQueryOptions, type CodeCompareResponse } from "../../../../api/code-compare";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/compare/$revisionRange")({
  component: ProjectCodeCompareRoute,
});

function ProjectCodeCompareRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeCompareScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeCompareScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, revisionRange } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const compareQuery = useQuery(
    codeCompareQueryOptions(runtimeConfig, { ownerName, projectName, revisionRange }),
  );

  if (!projectQuery.data || !compareQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectCodeCompareBody
        compare={compareQuery.data}
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
      />
    </>
  );
}

function ProjectCodeCompareBody({
  compare,
  ownerName,
  project,
  projectName,
}: {
  compare: CodeCompareResponse;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const commitA = compare.commitA?.commitId || compare.revA;
  const commitB = compare.commitB?.commitId || compare.revB;
  const vcs = typeof project.vcs === "string" ? project.vcs.toUpperCase() : "";
  const isSvn = vcs === "SVN" || vcs === "SUBVERSION";

  return (
    <div className="project-page-wrap">
      <div className="code-browse-wrap">
        <p className="commitInfo">
          <strong className="commitId">
            @{commitA}..{commitB}
          </strong>
        </p>
        {isSvn && compare.patch ? (
          <div className="diff-wrap">
            <div className="diff-body hide" data-commit-origin="true" id="commit">
              {compare.patch}
            </div>
          </div>
        ) : compare.files.length === 0 ? (
          <div className="alert">{t("code.noChanges")}</div>
        ) : (
          <div className="diff-body discommentable">
            {compare.files.map((file) => (
              <CompareFileDiff
                commitA={commitA}
                commitB={commitB}
                file={file}
                key={file.path}
                ownerName={ownerName}
                projectName={projectName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompareFileDiff({
  commitA,
  commitB,
  file,
  ownerName,
  projectName,
}: {
  commitA: string;
  commitB: string;
  file: CodeCompareResponse["files"][number];
  ownerName: string;
  projectName: string;
}) {
  if (file.patch.trim() === "") {
    return (
      <CompareNoChangesFileDiff
        commitA={commitA}
        commitB={commitB}
        file={file}
        ownerName={ownerName}
        projectName={projectName}
      />
    );
  }

  return (
    <div className="diff-file">
      <h2>
        <span className="filename">{file.path}</span>
      </h2>
      <pre>{file.patch}</pre>
    </div>
  );
}

function CompareNoChangesFileDiff({
  commitA,
  commitB,
  file,
  ownerName,
  projectName,
}: {
  commitA: string;
  commitB: string;
  file: CodeCompareResponse["files"][number];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const fileId = file.path.replace(/\//g, "-").replace(/\./g, "-");
  const shortA = shortenCommitId(commitA);
  const shortB = shortenCommitId(commitB);

  return (
    <div id={fileId} className="diff-partial-outer">
      <div className="diff-partial-inner">
        <div className="diff-partial-meta">
          <div className="diff-partial-commit">
            <div className="diff-partial-commit-id">
              {commitA && file.path ? (
                <Link
                  target="_blank"
                  title={commitA}
                  to={projectTo(ownerName, projectName, "code", commitA, file.path)}
                >
                  {shortA}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
            <div className="diff-partial-commit-id">
              {commitB && file.path ? (
                <Link
                  target="_blank"
                  title={commitB}
                  to={projectTo(ownerName, projectName, "code", commitB, file.path)}
                >
                  {shortB}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
          </div>
          <div className="diff-partial-file">
            <span className="filename">{file.path}</span>
          </div>
        </div>
        <div className="diff-partial-code" data-hashcode={file.path}>
          <div className="patch-header">
            <div className="path">{`--- ${file.path}`}</div>
            <div className="path">{`+++ ${file.path}`}</div>
          </div>
          <table
            className="diff-container show-comments"
            data-commit-a={commitA}
            data-commit-b={commitB}
            data-file-path={file.path}
            data-path-a={file.path}
            data-path-b={file.path}
          >
            <tbody>
              <tr>
                <td colSpan={3}>{t("code.noChanges")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function shortenCommitId(commitId: string) {
  return commitId.length < 7 ? commitId : commitId.slice(0, 7);
}

function projectTo(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}
