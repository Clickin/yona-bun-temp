import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
      <ProjectCodeCompareBody compare={compareQuery.data} project={projectQuery.data} />
    </>
  );
}

function ProjectCodeCompareBody({
  compare,
  project,
}: {
  compare: CodeCompareResponse;
  project: ProjectContainer;
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
              <div className="diff-file" key={file.path}>
                <h2>
                  <span className="filename">{file.path}</span>
                </h2>
                <pre>{file.patch}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
