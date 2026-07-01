import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { codeBrowserQueryOptions, type CodeBrowserResponse } from "../../../../../api/code-browser";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer } from "../../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { SiteLayoutShell } from "../../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/code/$branch/$filePath")({
  component: ProjectCodeFileRoute,
});

type CodeFile = Record<string, unknown>;

function ProjectCodeFileRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeFileScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeFileScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { branch, filePath, ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const codeQuery = useQuery(
    codeBrowserQueryOptions(runtimeConfig, { branch, ownerName, path: filePath, projectName }),
  );

  if (!projectQuery.data || !codeQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectCodeFileBody
        code={codeQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectCodeFileBody({
  code,
  project,
  runtimeConfig,
}: {
  code: CodeBrowserResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { branch, filePath, ownerName, projectName } = Route.useParams();
  const selectedBranch = code.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="code-browse-wrap">
          <div className="code-browse-header">
            <select
              id="branches"
              data-toggle="select2"
              data-format="branch"
              data-dropdown-css-class="branches"
              className="pull-left mb10"
              defaultValue={projectHref(
                runtimeConfig.basePath,
                ownerName,
                projectName,
                "code",
                encodedBranch,
                filePath,
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
                    encodeURIComponent(item.name),
                    filePath,
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
              {code.breadcrumbs.map((item) => (
                <a
                  href={projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "code",
                    encodedBranch,
                    item.path,
                  )}
                  key={item.path}
                >
                  {item.name}
                </a>
              ))}
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
            <FileView
              file={recordField(code.file)}
              filePath={filePath}
              project={project}
              runtimeConfig={runtimeConfig}
              selectedBranch={selectedBranch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FileView({
  file,
  filePath,
  project,
  runtimeConfig,
  selectedBranch,
}: {
  file: CodeFile;
  filePath: string;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const commitId = stringField(file.commitId, "");
  const shortCommitId = commitId.slice(0, 7);
  const authorLoginId = stringField(file.userLoginId, "");
  const authorHref = prefixBasePath(runtimeConfig.basePath, `/${authorLoginId}`);
  const rawHref = projectHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    "rawcode",
    encodeURIComponent(selectedBranch),
    filePath,
  );
  const openHref = projectHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    "files",
    encodeURIComponent(selectedBranch),
    filePath,
  );

  return (
    <div className="file-wrap" data-type="file">
      <div className="file-header nm">
        <div id="fileInfo" className="file-info">
          <span id="commiter" className="commiter">
            <a
              href={authorHref}
              className="avatar-wrap"
              data-toggle="tooltip"
              data-placement="top"
              title={authorLoginId}
            >
              <img src={stringField(file.avatarUrl, "")} alt="" width="32" height="32" />
            </a>
            <a href={authorHref} className="ml5">
              {stringField(file.author, "")}
            </a>
          </span>
          <span id="commitDate" className="commitDate">
            {stringField(file.createdDate, "")}
          </span>
          <span id="revisionNo" className="revision">
            <a
              href={`${projectHref(
                runtimeConfig.basePath,
                ownerName,
                projectName,
                "commit",
                commitId,
              )}?branch=${encodeURIComponent(selectedBranch)}#${filePath}`}
            >
              {shortCommitId}
              {numberField(file.commentCount) > 0 ? (
                <span className="number-of-comments ml5">
                  <i className="yobicon-comments"></i> {numberField(file.commentCount)}
                </span>
              ) : null}
            </a>
          </span>
          <span id="commitMessage" className="commitMsg">
            {stringField(file.commitMessage, "")}
          </span>
          <span>{stringField(file.lineEnding, "")}</span>
        </div>
        <div className="pull-right">
          <a href={rawHref} className="ybtn" target="_blank">
            <i className="yobicon-download-alt yobicon-white vmiddle"></i> Raw
          </a>
          {booleanField(project.viewerCanUpdate) ? (
            <a
              href={`${projectHref(runtimeConfig.basePath, ownerName, projectName, "postform")}?path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(selectedBranch)}&edit=true`}
              className="ybtn"
            >
              Edit
            </a>
          ) : null}
          <a
            id="open-in-browser"
            href={openHref}
            className="ybtn"
            target="_blank"
            data-content={t("code.open.desc")}
          >
            <i className="yobicon-download-alt yobicon-white vmiddle"></i> {t("code.open")}
          </a>
          <a
            href={projectHref(
              runtimeConfig.basePath,
              ownerName,
              projectName,
              "commits",
              encodeURIComponent(selectedBranch),
              filePath,
            )}
            className="ybtn"
          >
            {t("code.history")}
          </a>
        </div>
      </div>
      <div id="codeVal" className="hidden">
        {stringField(file.data, "")}
      </div>
      <pre id="showCode" className="code-wrap" data-mimetype={stringField(file.mimeType, "")}></pre>
    </div>
  );
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function recordField(value: unknown): CodeFile {
  return value && typeof value === "object" ? (value as CodeFile) : {};
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function numberField(value: unknown) {
  return typeof value === "number" ? value : Number(value) || 0;
}

function booleanField(value: unknown) {
  return value === true || value === "true";
}
