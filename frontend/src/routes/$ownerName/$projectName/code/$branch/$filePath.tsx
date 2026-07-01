import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

const MAX_FILE_SIZE_CAN_BE_VIEWED = 1024 * 1024;

export type ProjectCodeFileRouteParams = {
  branch: string;
  filePath: string;
  ownerName: string;
  projectName: string;
};

function ProjectCodeFileRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const routeParams = Route.useParams();

  return <ProjectCodeFileRouteFrame routeParams={routeParams} runtimeConfig={runtimeConfig} />;
}

export function ProjectCodeFileRouteFrame({
  routeParams,
  runtimeConfig,
}: {
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeFileScreen routeParams={routeParams} runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeFileScreen({
  routeParams,
  runtimeConfig,
}: {
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, filePath, ownerName, projectName } = routeParams;
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
        routeParams={routeParams}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectCodeFileBody({
  code,
  project,
  routeParams,
  runtimeConfig,
}: {
  code: CodeBrowserResponse;
  project: ProjectContainer;
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { branch, filePath, ownerName, projectName } = routeParams;
  const selectedBranch = code.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);
  const newFilePath = directoryPath(filePath);
  const isGit = project.vcs === "GIT";

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
            {isGit ? (
              <>
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
                      href={`${projectHref(runtimeConfig.basePath, ownerName, projectName, "postform")}?path=${newFilePath}&branch=${encodedBranch}`}
                      className="ybtn"
                    >
                      {t("code.new.file")}
                    </a>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="code-viewer-wrap">
            <div id="spin" style={{ position: "fixed", top: "50%", left: "50%" }}></div>
            <FileView
              file={recordField(code.file)}
              filePath={filePath}
              ownerName={ownerName}
              project={project}
              projectName={projectName}
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
  ownerName,
  project,
  projectName,
  runtimeConfig,
  selectedBranch,
}: {
  file: CodeFile;
  filePath: string;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  const { t } = useLegacyMessages();
  const commitId = stringField(file.commitId, "");
  const shortCommitId = commitId.slice(0, 7);
  const isGit = project.vcs === "GIT";
  const authorLoginId = stringField(file.userLoginId, "");
  const authorHref = prefixBasePath(runtimeConfig.basePath, `/${authorLoginId}`);
  const hasViewableText = typeof file.data === "string" || typeof file.text === "string";
  const fileText = stringField(file.data, "") || stringField(file.text, "");
  const isBinary = booleanField(file.isBinary);
  const isTooLargeText = !isBinary && !hasViewableText && numberField(file.size) > 0;
  const mimeType = stringField(file.mimeType, "");
  const rawHref = projectHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    "rawcode",
    encodeURIComponent(isGit ? selectedBranch : commitId),
    filePath,
  );
  const openHref = projectHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    "files",
    encodeURIComponent(isGit ? selectedBranch : commitId),
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
              {isGit ? shortCommitId : `Revision ${commitId}`}
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
          {!isBinary ? (
            <>
              <a href={rawHref} className="ybtn" target="_blank">
                <i className="yobicon-download-alt yobicon-white vmiddle"></i> Raw
              </a>
              {booleanField(project.viewerCanUpdate) ? (
                <a
                  href={`${projectHref(runtimeConfig.basePath, ownerName, projectName, "postform")}?path=${filePath}&branch=${encodeURIComponent(selectedBranch)}&edit=true`}
                  className="ybtn"
                >
                  Edit
                </a>
              ) : null}
            </>
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
      {isBinary ? (
        mimeType.startsWith("image/") ? (
          <div id="showImage" className="image-wrap">
            <img src={rawHref} alt="" />
          </div>
        ) : (
          <div id="showFile" className="file-wrap">
            <p>
              <strong className="filename">{filePath.split("/").pop() ?? filePath}</strong>
              <br />
              <span className="filesize">{stringField(file.size, "")}</span>
              <br />
              <a href={rawHref} className="filehref ybtn">
                <i className="yobicon-download-alt yobicon-white vmiddle"></i>{" "}
                {t("button.download")}
              </a>
            </p>
          </div>
        )
      ) : isTooLargeText ? (
        <p>
          {t("code.tooBigFileForCodeBrowser", { args: [MAX_FILE_SIZE_CAN_BE_VIEWED] })}
          <br />
          <a href={rawHref} target="_blank" className="filehref ybtn">
            {t("code.viewRaw")}
          </a>
        </p>
      ) : isMarkdownPath(filePath) ? (
        <div id="codeVal" className="markdown-wrap codebrowser-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileText}</ReactMarkdown>
        </div>
      ) : (
        <>
          <div id="codeVal" className="hidden">
            {fileText}
          </div>
          <pre id="showCode" className="code-wrap" data-mimetype={mimeType}></pre>
        </>
      )}
    </div>
  );
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function directoryPath(filePath: string) {
  const slash = filePath.lastIndexOf("/");
  return slash > 0 ? `${filePath.slice(0, slash)}/` : "";
}

function isMarkdownPath(filePath: string) {
  return ["markdown", "mdown", "mkdn", "mkd", "md", "mdwn"].includes(
    filePath.split(".").pop()?.toLowerCase() ?? "",
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
