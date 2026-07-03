import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
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
const legacyLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyEmptySearch = {} as never;
const legacyInactiveSearch = { __legacyInactive: undefined } as never;

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
  const archivePath = projectPath(ownerName, projectName, "archive", `${encodedBranch}.zip`);

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
              <Link
                to="/$ownerName/$projectName/code/$branch"
                params={{ branch: selectedBranch, ownerName, projectName }}
                search={legacyInactiveSearch}
                {...legacyLinkProps}
              >
                {projectName}
              </Link>
              {code.breadcrumbs.map((item) => (
                <Link
                  key={item.path}
                  to={
                    projectPath(ownerName, projectName, "code", encodedBranch, item.path) as never
                  }
                  search={legacyInactiveSearch}
                  {...legacyLinkProps}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            {isGit ? (
              <>
                <div className="pull-right">
                  <Link
                    to={archivePath as never}
                    reloadDocument
                    className="ybtn"
                    activeProps={{ className: "ybtn" }}
                  >
                    {t("code.download")}
                  </Link>
                </div>
                {booleanField(project.viewerCanUpdate) ? (
                  <div className="pull-right">
                    <Link
                      id="new-file-link"
                      to={
                        `${projectPath(
                          ownerName,
                          projectName,
                          "postform",
                        )}?path=${newFilePath}&branch=${encodedBranch}` as never
                      }
                      {...legacyLinkProps}
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
  const hasViewableText = typeof file.data === "string" || typeof file.text === "string";
  const fileText = stringField(file.data, "") || stringField(file.text, "");
  const isBinary = booleanField(file.isBinary);
  const isTooLargeText = !isBinary && !hasViewableText && numberField(file.size) > 0;
  const mimeType = stringField(file.mimeType, "");
  const rawRevision = encodeURIComponent(isGit ? selectedBranch : commitId);
  const rawPath = projectPath(ownerName, projectName, "rawcode", rawRevision, filePath);
  const rawHref = prefixBasePath(runtimeConfig.basePath, rawPath);
  const openPath = projectPath(ownerName, projectName, "files", rawRevision, filePath);

  return (
    <div className="file-wrap" data-type="file">
      <div className="file-header nm">
        <div id="fileInfo" className="file-info">
          <span id="commiter" className="commiter">
            <Link
              to="/$user"
              params={{ user: authorLoginId }}
              search={legacyEmptySearch}
              {...legacyLinkProps}
              className="avatar-wrap"
              data-toggle="tooltip"
              data-placement="top"
              title={authorLoginId}
            >
              <img src={stringField(file.avatarUrl, "")} alt="" width="32" height="32" />
            </Link>
            <Link
              to="/$user"
              params={{ user: authorLoginId }}
              search={legacyEmptySearch}
              {...legacyLinkProps}
              className="ml5"
            >
              {stringField(file.author, "")}
            </Link>
          </span>
          <span id="commitDate" className="commitDate">
            {stringField(file.createdDate, "")}
          </span>
          <span id="revisionNo" className="revision">
            <Link
              to={
                `${projectPath(
                  ownerName,
                  projectName,
                  "commit",
                  commitId,
                )}?branch=${encodeURIComponent(selectedBranch)}` as never
              }
              hash={filePath}
              {...legacyLinkProps}
            >
              {isGit ? shortCommitId : `Revision ${commitId}`}
              {numberField(file.commentCount) > 0 ? (
                <span className="number-of-comments ml5">
                  <i className="yobicon-comments"></i> {numberField(file.commentCount)}
                </span>
              ) : null}
            </Link>
          </span>
          <span id="commitMessage" className="commitMsg">
            {stringField(file.commitMessage, "")}
          </span>
          <span>{stringField(file.lineEnding, "")}</span>
        </div>
        <div className="pull-right">
          {!isBinary ? (
            <>
              <Link
                to={rawPath as never}
                className="ybtn"
                target="_blank"
                activeProps={{ className: "ybtn" }}
              >
                <i className="yobicon-download-alt yobicon-white vmiddle"></i> Raw
              </Link>
              {booleanField(project.viewerCanUpdate) ? (
                <Link
                  to={
                    `${projectPath(
                      ownerName,
                      projectName,
                      "postform",
                    )}?path=${filePath}&branch=${encodeURIComponent(selectedBranch)}&edit=true` as never
                  }
                  {...legacyLinkProps}
                  className="ybtn"
                >
                  Edit
                </Link>
              ) : null}
            </>
          ) : null}
          <Link
            id="open-in-browser"
            to={openPath as never}
            className="ybtn"
            target="_blank"
            data-content={t("code.open.desc")}
            activeProps={{ className: "ybtn" }}
          >
            <i className="yobicon-download-alt yobicon-white vmiddle"></i> {t("code.open")}
          </Link>
          <Link
            to={
              projectPath(
                ownerName,
                projectName,
                "commits",
                encodeURIComponent(selectedBranch),
                filePath,
              ) as never
            }
            {...legacyLinkProps}
            className="ybtn"
          >
            {t("code.history")}
          </Link>
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
              <Link
                to={rawPath as never}
                reloadDocument
                className="filehref ybtn"
                activeProps={{ className: "filehref ybtn" }}
              >
                <i className="yobicon-download-alt yobicon-white vmiddle"></i>{" "}
                {t("button.download")}
              </Link>
            </p>
          </div>
        )
      ) : isTooLargeText ? (
        <p>
          {t("code.tooBigFileForCodeBrowser", { args: [MAX_FILE_SIZE_CAN_BE_VIEWED] })}
          <br />
          <Link
            to={rawPath as never}
            target="_blank"
            className="filehref ybtn"
            activeProps={{ className: "filehref ybtn" }}
          >
            {t("code.viewRaw")}
          </Link>
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
  return prefixBasePath(basePath, projectPath(ownerName, projectName, ...parts));
}

function projectPath(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
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
