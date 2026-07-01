import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { codeBrowserQueryOptions, type CodeBrowserResponse } from "../../../../api/code-browser";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/code/$branch")({
  component: ProjectCodeBranchRoute,
});

function ProjectCodeBranchRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { branch, ownerName, projectName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isProjectCodeBranchRoot =
    pathname === `/${ownerName}/${projectName}/code/${encodeURIComponent(branch)}`;

  if (!isProjectCodeBranchRoot) {
    return <Outlet />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeBranchScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeBranchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { branch, ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const codeQuery = useQuery(
    codeBrowserQueryOptions(runtimeConfig, { branch, ownerName, path: "", projectName }),
  );

  if (!projectQuery.data || !codeQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectCodeFolderBody
        code={codeQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectCodeFolderBody({
  code,
  project,
  runtimeConfig,
}: {
  code: CodeBrowserResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { branch, ownerName, projectName } = Route.useParams();
  const selectedBranch = code.selectedBranch || branch;
  const encodedBranch = encodeBranch(selectedBranch);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="code-browse-wrap">
          <ul className="nav nav-tabs">
            <li className="active">
              <a
                href={projectHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  "code",
                  encodedBranch,
                )}
              >
                {t("code.files")}
              </a>
            </li>
            <li>
              <a
                href={projectHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  "commits",
                  encodedBranch,
                )}
              >
                {t("code.commits")}
              </a>
            </li>
            <li>
              <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "branches")}>
                {t("title.branches")}
              </a>
            </li>
          </ul>

          <div className="code-browse-header">
            <select
              id="branches"
              data-toggle="select2"
              data-format="branch"
              data-dropdown-css-class="branches"
              className="pull-left"
              defaultValue={projectHref(
                runtimeConfig.basePath,
                ownerName,
                projectName,
                "code",
                encodedBranch,
              )}
            >
              {code.branches.map((item) => (
                <option
                  key={item.name}
                  value={projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "code",
                    encodeBranch(item.name),
                  )}
                >
                  {item.name}
                </option>
              ))}
            </select>
            <div id="breadcrumbs" className="code-breadcrumb-wrap ml10 pull-left">
              <a
                href={projectHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  "code",
                  encodedBranch,
                )}
              >
                {projectName}
              </a>
            </div>
            <div className="pull-right">
              <a
                href={projectHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  "archive",
                  `${encodedBranch}.zip`,
                )}
                className="ybtn"
              >
                {t("code.download")}
              </a>
            </div>
            {booleanField(project.viewerCanUpdate) ? (
              <div className="pull-right">
                <a
                  id="new-file-link"
                  href={`${projectHref(runtimeConfig.basePath, ownerName, projectName, "postform")}?path=&branch=${encodedBranch}`}
                  className="ybtn"
                >
                  {t("code.new.file")}
                </a>
              </div>
            ) : null}
          </div>

          <div className="code-viewer-wrap">
            <div id="spin" style={{ position: "fixed", top: "50%", left: "50%" }}></div>
            <FolderList code={code} runtimeConfig={runtimeConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderList({
  code,
  runtimeConfig,
}: {
  code: CodeBrowserResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { branch, ownerName, projectName } = Route.useParams();
  const selectedBranch = code.selectedBranch || branch;
  const folders = code.entries.filter((entry) => entry.kind === "folder");
  const files = code.entries.filter((entry) => entry.kind !== "folder");

  return (
    <div className="list-wrap" data-type="folder">
      <div className="row-fluid listhead">
        <div className="span6 filename">
          <strong>{t("code.filename")}</strong>
        </div>
        <div className="span4 commitMsg">
          <strong>{t("code.commitMsg")}</strong>
        </div>
        <div className="span2 commitDate">
          <strong>{t("code.commitDate")}</strong>
        </div>
      </div>

      {code.entries.length === 0 ? (
        <div className="alert alert-warning nm" style={{ borderTop: 0, paddingLeft: "23px" }}>
          {t("code.nofiles")}
        </div>
      ) : null}

      {[...folders, ...files].map((entry) => (
        <div
          id={`cb-${entry.path}`}
          className="row-fluid listitem"
          data-path={entry.path}
          key={entry.path}
        >
          <div className="span6 filename">
            <a
              href={`${projectHref(
                runtimeConfig.basePath,
                ownerName,
                projectName,
                "code",
                encodeBranch(selectedBranch),
                entry.path,
              )}${entry.kind === "folder" ? `#cb-${entry.path}` : ""}`}
              className={entry.kind === "folder" ? "folder" : "file"}
              title={entry.name}
              {...(entry.kind === "folder" ? { "data-type": "folder" } : {})}
              data-targetpath={entry.path}
            >
              <span className="dynatree-icon vmiddle"></span>
              {entry.name}
            </a>
          </div>
          <div className="span5 commitMsg">
            <span className="ml5">
              <a
                href={commitHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  entry.commitShortId,
                  selectedBranch,
                )}
              >
                {entry.commitMessage}
              </a>
            </span>
          </div>
          <div className="span1 commitDate">{entry.commitDate}</div>
        </div>
      ))}
    </div>
  );
}

function commitHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  commitId: string,
  branch: string,
) {
  return `${projectHref(basePath, ownerName, projectName, "commit", commitId)}?branch=${encodeURIComponent(branch)}`;
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function encodeBranch(branch: string) {
  return encodeURIComponent(branch);
}

function booleanField(value: unknown) {
  return value === true || value === "true";
}
