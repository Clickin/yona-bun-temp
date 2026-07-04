import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
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
  const router = useRouter();
  const { branch, ownerName, projectName } = Route.useParams();
  const selectedBranch = code.selectedBranch || branch;
  const encodedBranch = encodeBranch(selectedBranch);
  const isGit = project.vcs === "GIT";

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="code-browse-wrap">
          <ul className="nav nav-tabs">
            <li className="active">
              <Link
                activeOptions={{
                  exact: true,
                  explicitUndefined: true,
                  includeHash: true,
                  includeSearch: true,
                }}
                activeProps={{
                  "aria-current": undefined,
                  className: undefined,
                  "data-status": undefined,
                }}
                to={projectRoute(ownerName, projectName, "code", encodedBranch)}
                hash="code-browser-active-sentinel"
                mask={{ to: projectRoute(ownerName, projectName, "code", encodedBranch) }}
              >
                {t("code.files")}
              </Link>
            </li>
            <li>
              <Link
                activeOptions={{
                  exact: true,
                  explicitUndefined: true,
                  includeHash: true,
                  includeSearch: true,
                }}
                activeProps={{
                  "aria-current": undefined,
                  className: undefined,
                  "data-status": undefined,
                }}
                to={projectRoute(ownerName, projectName, "commits", encodedBranch)}
              >
                {t("code.commits")}
              </Link>
            </li>
            {isGit ? (
              <li>
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  to={projectRoute(ownerName, projectName, "branches")}
                >
                  {t("title.branches")}
                </Link>
              </li>
            ) : null}
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
              onChange={(event) => {
                router.history.push(event.currentTarget.value);
              }}
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
              <Link
                activeOptions={{
                  exact: true,
                  explicitUndefined: true,
                  includeHash: true,
                  includeSearch: true,
                }}
                activeProps={{
                  "aria-current": undefined,
                  className: undefined,
                  "data-status": undefined,
                }}
                to={projectRoute(ownerName, projectName, "code", encodedBranch)}
                hash="code-browser-active-sentinel"
                mask={{ to: projectRoute(ownerName, projectName, "code", encodedBranch) }}
              >
                {projectName}
              </Link>
            </div>
            {isGit ? (
              <>
                <div className="pull-right">
                  <Link
                    activeOptions={{
                      exact: true,
                      explicitUndefined: true,
                      includeHash: true,
                      includeSearch: true,
                    }}
                    activeProps={{
                      "aria-current": undefined,
                      className: undefined,
                      "data-status": undefined,
                    }}
                    to={projectRoute(ownerName, projectName, "archive", `${encodedBranch}.zip`)}
                    reloadDocument
                    className="ybtn"
                  >
                    {t("code.download")}
                  </Link>
                </div>
                {booleanField(project.viewerCanUpdate) ? (
                  <div className="pull-right">
                    <Link
                      activeOptions={{
                        exact: true,
                        explicitUndefined: true,
                        includeHash: true,
                        includeSearch: true,
                      }}
                      activeProps={{
                        "aria-current": undefined,
                        className: undefined,
                        "data-status": undefined,
                      }}
                      id="new-file-link"
                      to={projectRoute(ownerName, projectName, "postform")}
                      search={{ path: "", branch: selectedBranch }}
                      className="ybtn"
                    >
                      {t("code.new.file")}
                    </Link>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="code-viewer-wrap">
            <div id="spin" style={{ position: "fixed", top: "50%", left: "50%" }}></div>
            <FolderList code={code} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderList({ code }: { code: CodeBrowserResponse }) {
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
            <Link
              activeOptions={{
                exact: true,
                explicitUndefined: true,
                includeHash: true,
                includeSearch: true,
              }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              to={projectRoute(
                ownerName,
                projectName,
                "code",
                encodeBranch(selectedBranch),
                entry.path,
              )}
              hash={entry.kind === "folder" ? `cb-${entry.path}` : undefined}
              className={entry.kind === "folder" ? "folder" : "file"}
              title={entry.name}
              {...(entry.kind === "folder" ? { "data-type": "folder" } : {})}
              data-targetpath={entry.path}
            >
              <span className="dynatree-icon vmiddle"></span>
              {entry.name}
            </Link>
          </div>
          <div className="span5 commitMsg">
            <span className="ml5">
              <Link
                activeOptions={{
                  exact: true,
                  explicitUndefined: true,
                  includeHash: true,
                  includeSearch: true,
                }}
                activeProps={{
                  "aria-current": undefined,
                  className: undefined,
                  "data-status": undefined,
                }}
                to={projectRoute(ownerName, projectName, "commit", entry.commitShortId)}
                search={{ branch: selectedBranch }}
              >
                {entry.commitMessage}
              </Link>
            </span>
          </div>
          <div className="span1 commitDate">{entry.commitDate}</div>
        </div>
      ))}
    </div>
  );
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function projectRoute(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}

function encodeBranch(branch: string) {
  return encodeURIComponent(branch);
}

function booleanField(value: unknown) {
  return value === true || value === "true";
}
