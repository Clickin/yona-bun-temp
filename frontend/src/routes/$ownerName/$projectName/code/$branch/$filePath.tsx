import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { LegacyMarkdown } from "../../../../../components/legacy-markdown";
import {
  highlightCodeToReactNodes,
  injectMarkdownHighlightTheme,
} from "../../../../../components/markdown-highlight";
const MIME_TYPE_LANGUAGE: Record<string, string> = {
  "text/javascript": "javascript",
  "application/javascript": "javascript",
  "application/x-javascript": "javascript",
  "text/typescript": "typescript",
  "application/typescript": "typescript",
  "text/jsx": "jsx",
  "text/tsx": "tsx",
  "text/x-kotlin": "kotlin",
  "text/x-java-source": "java",
  "text/x-scala": "scala",
  "text/x-python": "python",
  "text/x-go": "go",
  "text/x-rust": "rust",
  "text/yaml": "yaml",
  "application/yaml": "yaml",
  "text/x-yaml": "yaml",
  "application/json": "json",
  "text/json": "json",
  "application/xml": "xml",
  "text/xml": "xml",
  "text/markdown": "markdown",
  "text/css": "css",
  "text/x-scss": "scss",
  "text/x-sql": "sql",
  "text/x-sh": "bash",
  "application/x-sh": "bash",
  "text/x-shellscript": "bash",
  "text/x-diff": "diff",
  "text/x-groovy": "groovy",
  "text/x-c": "c",
  "text/x-c++": "cpp",
  "text/x-csharp": "csharp",
  "text/x-ruby": "ruby",
  "text/x-php": "php",
  "text/x-dockerfile": "docker",
  "text/x-ini": "ini",
  "text/x-properties": "properties",
};

const FILE_EXTENSION_LANGUAGE: Record<string, string> = {
  cjs: "javascript",
  js: "javascript",
  mjs: "javascript",
  cts: "typescript",
  mts: "typescript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  kt: "kotlin",
  kts: "kotlin",
  java: "java",
  sc: "scala",
  scala: "scala",
  py: "python",
  go: "go",
  rs: "rust",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  html: "xml",
  htm: "xml",
  svg: "xml",
  xml: "xml",
  markdown: "markdown",
  md: "markdown",
  css: "css",
  scss: "scss",
  sql: "sql",
  bash: "bash",
  sh: "bash",
  zsh: "bash",
  diff: "diff",
  patch: "diff",
  gradle: "groovy",
  groovy: "groovy",
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hh: "cpp",
  hpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  dockerfile: "docker",
  cfg: "ini",
  ini: "ini",
  properties: "properties",
};

function codeLanguage(mimeType: string, fileName: string): string | undefined {
  const byMimeType = MIME_TYPE_LANGUAGE[mimeType.toLowerCase()];
  if (byMimeType) {
    return byMimeType;
  }
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  return FILE_EXTENSION_LANGUAGE[extension];
}

import {
  codeBrowserQueryOptions,
  type CodeBrowserEntry,
  type CodeBrowserResponse,
} from "../../../../../api/code-browser";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import { currentSessionQueryOptions } from "../../../../../api/session";
import type { ProjectContainer } from "../../../../../api/types";
import { useLegacyMessages } from "../../../../../i18n";
import {
  useLockedLinkClick,
  useWireframeContentProgress,
} from "../../../../../components/route-fetch-lock";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import legacySpriteUrl from "../../../../../assets/legacy/sprite.png";

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
  return <ProjectCodeFileRouteShell routeParams={routeParams} runtimeConfig={runtimeConfig} />;
}

function ProjectCodeFileRouteShell({
  routeParams,
  runtimeConfig,
}: {
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = routeParams;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
  };
  return (
    <ProjectCodeFileScreen
      project={projectQuery.data}
      _projectSearchScope={projectSearchScope}
      routeParams={routeParams}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectCodeFileScreen({
  project,
  _projectSearchScope,
  routeParams,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  _projectSearchScope?: { organizationName?: string };
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, filePath, ownerName, projectName } = routeParams;
  useWireframeContentProgress([
    ["api", "v1", "owners", ownerName, "projects", projectName, "code"],
  ]);
  const codeQuery = useQuery(
    codeBrowserQueryOptions(runtimeConfig, { branch, ownerName, path: filePath, projectName }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const { t } = useLegacyMessages();

  if (!project || !sessionQuery.data) {
    return null;
  }

  if (codeQuery.isError) {
    return (
      <>
        <title>{`${branch} - ${ownerName}/${projectName}`}</title>
        <ProjectCodeNotFound branch={branch} ownerName={ownerName} projectName={projectName} />
      </>
    );
  }

  if (!codeQuery.data) {
    return null;
  }

  return (
    <>
      <title>{`${t("menu.code")} - ${ownerName}/${projectName}`}</title>
      <ProjectCodeFileBody
        code={codeQuery.data}
        currentUserIsAnonymous={booleanField(sessionQuery.data.isAnonymous)}
        currentUserIsSiteAdmin={booleanField(sessionQuery.data.isSiteAdmin)}
        project={project}
        routeParams={routeParams}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectCodeNotFound({
  branch,
  ownerName,
  projectName,
}: {
  branch: string;
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  return (
    <div className="page-wrap-outer" data-owner="project-code-file-error-page">
      <div className="project-page-wrap">
        <div className="error-wrap" data-owner="project-code-file-error-wrap">
          <i
            style={{
              backgroundImage: `url(${legacySpriteUrl})`,
              backgroundPosition: "-80px -160px",
              backgroundRepeat: "no-repeat",
              display: "inline-block",
              height: "80px",
              verticalAlign: "middle",
              width: "50px",
            }}
            className="ico ico-err2"
            data-owner="project-code-file-error-icon"
          ></i>
          <p data-owner="project-code-file-error-message">
            {t("error.notfound.code", { args: [branch] })}
          </p>
          <Link
            to={projectPath(ownerName, projectName, "settingform")}
            className="ybtn ybtn-primary"
            data-owner="project-code-file-error-list"
          >
            {t("button.list")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectCodeFileBody({
  code,
  currentUserIsAnonymous,
  currentUserIsSiteAdmin,
  project,
  routeParams,
  runtimeConfig,
}: {
  code: CodeBrowserResponse;
  currentUserIsAnonymous: boolean;
  currentUserIsSiteAdmin: boolean;
  project: ProjectContainer;
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const lockedLinkClick = useLockedLinkClick();
  const { branch, filePath, ownerName, projectName } = routeParams;
  const selectedBranch = code.selectedBranch || branch;
  const selectedBranchItemName = branchItemName(selectedBranch);
  const encodedBranch = encodeURIComponent(selectedBranch);
  const encodedBranchItemName = encodeURIComponent(selectedBranchItemName);
  const isFolder = code.file === null;
  const newFilePath = isFolder ? `${filePath}/` : directoryPath(filePath);
  const isGit = project.vcs === "GIT";
  const archiveZipPath = projectPath(ownerName, projectName, "archive", `${encodedBranch}.zip`);
  const newFilePathWithSearch = `${projectPath(
    ownerName,
    projectName,
    "postform",
  )}?path=${newFilePath}&branch=${encodedBranchItemName}`;

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="code-browse-wrap">
          {isFolder ? (
            <ul className="nav nav-tabs">
              <li className="active">
                <Link
                  to={projectPath(
                    ownerName,
                    projectName,
                    "code",
                    encodedBranch,
                    pathWithoutFileName(filePath),
                  )}
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
                >
                  {t("code.files")}
                </Link>
              </li>
              <li>
                <Link
                  to={projectPath(ownerName, projectName, "commits", encodedBranch)}
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
                >
                  {t("code.commits")}
                </Link>
              </li>
              {isGit ? (
                <li>
                  <Link
                    to={projectPath(ownerName, projectName, "branches")}
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
                  >
                    {t("title.branches")}
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
          <div className="code-browse-header">
            <select
              id="branches"
              data-format="branch"
              data-dropdown-css-class="branches"
              className={`pull-left${isFolder ? "" : " mb10"}`}
              data-owner="project-code-file-branch-picker"
              defaultValue={projectHref(
                runtimeConfig.basePath,
                ownerName,
                projectName,
                "code",
                encodedBranchItemName,
                filePath,
              )}
              onChange={(event) => {
                router.history.push(event.currentTarget.value);
              }}
            >
              {code.branches.map((item) => {
                const branchName = branchItemName(item.name);
                return (
                  <option
                    key={item.name}
                    value={projectHref(
                      runtimeConfig.basePath,
                      ownerName,
                      projectName,
                      "code",
                      encodeURIComponent(branchName),
                      filePath,
                    )}
                  >
                    {item.name}
                  </option>
                );
              })}
            </select>
            <div
              id="breadcrumbs"
              className="code-breadcrumb-wrap ml10 pull-left"
              data-owner="project-code-file-breadcrumbs"
            >
              <Link
                onClick={lockedLinkClick}
                to="/$ownerName/$projectName/code/$branch"
                params={{ branch: selectedBranch, ownerName, projectName }}
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
              >
                {projectName}
              </Link>
              {code.breadcrumbs.map((item) => (
                <Link
                  key={item.path}
                  onClick={lockedLinkClick}
                  to={projectPath(ownerName, projectName, "code", encodedBranch, item.path)}
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
                >
                  {item.name}
                </Link>
              ))}
            </div>
            {isGit ? (
              <>
                <div className="pull-right" data-owner="project-code-file-download-action">
                  <Link to={archiveZipPath} reloadDocument className="ybtn">
                    {t("code.download")}
                  </Link>
                </div>
                {!currentUserIsAnonymous ? (
                  <div className="pull-right" data-owner="project-code-file-new-file-action">
                    <Link
                      id="new-file-link"
                      to={newFilePathWithSearch}
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
            <div
              id="spin"
              style={{ position: "fixed", top: "50%", left: "50%" }}
              data-owner="project-code-file-spinner"
            ></div>
            {isFolder ? (
              <FolderList
                code={code}
                filePath={filePath}
                ownerName={ownerName}
                projectName={projectName}
                selectedBranch={selectedBranch}
              />
            ) : (
              <FileView
                file={recordField(code.file)}
                filePath={filePath}
                currentUserIsAnonymous={currentUserIsAnonymous}
                currentUserIsSiteAdmin={currentUserIsSiteAdmin}
                ownerName={ownerName}
                project={project}
                projectName={projectName}
                runtimeConfig={runtimeConfig}
                selectedBranch={selectedBranch}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderList({
  code,
  filePath,
  ownerName,
  projectName,
  selectedBranch,
}: {
  code: CodeBrowserResponse;
  filePath: string;
  ownerName: string;
  projectName: string;
  selectedBranch: string;
}) {
  const { t } = useLegacyMessages();
  const folders = code.entries.filter((entry) => entry.kind === "folder");
  const files = code.entries.filter((entry) => entry.kind !== "folder");

  return (
    // F5 display:block — yona-original/app/assets/stylesheets/less/_page.less:4671
    // (see the branch-route FolderList comment: the frozen fallback hides
    // .list-wrap for the legacy dynatree renderer; the React route re-shows it).
    <div
      className="list-wrap"
      style={{ display: "block" }}
      data-owner="project-code-folder-list-wrap"
    >
      <div className="row-fluid listhead" data-owner="project-code-folder-list-head">
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
        <div className="alert alert-warning nm" data-owner="project-code-file-no-files">
          {t("code.nofiles")}
        </div>
      ) : null}

      {[...folders, ...files].map((entry) => (
        <FolderListEntry
          entry={entry}
          key={entry.path}
          listPath={filePath}
          ownerName={ownerName}
          projectName={projectName}
          selectedBranch={selectedBranch}
        />
      ))}
    </div>
  );
}

function FolderListEntry({
  entry,
  listPath,
  ownerName,
  projectName,
  selectedBranch,
}: {
  entry: CodeBrowserEntry;
  listPath: string;
  ownerName: string;
  projectName: string;
  selectedBranch: string;
}) {
  const rowId = `cb-${listPath}${entry.name}`;
  const lockedLinkClick = useLockedLinkClick();
  const encodedBranch = encodeURIComponent(selectedBranch);

  return (
    <div id={rowId} className="row-fluid listitem" data-owner="project-code-folder-row">
      <div className="span6 filename" data-owner="project-code-folder-filename">
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
          onClick={lockedLinkClick}
          to={projectPath(ownerName, projectName, "code", encodedBranch, entry.path)}
          hash={entry.kind === "folder" ? rowId : undefined}
          className={entry.kind === "folder" ? "folder" : "file"}
          title={entry.name}
        >
          <span className="dynatree-icon vmiddle"></span>
          {entry.name}
        </Link>
      </div>
      <div className="span5 commitMsg" data-owner="project-code-folder-commit-message">
        <span className="ml5" data-owner="project-code-folder-commit-message-wrapper">
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
            to={projectPath(ownerName, projectName, "commit", entry.commitShortId)}
            search={{ branch: selectedBranch }}
          >
            {entry.commitMessage}
          </Link>
        </span>
      </div>
      <div className="span1 commitDate" data-owner="project-code-folder-commit-date">
        {entry.commitDate}
      </div>
    </div>
  );
}

function FileView({
  currentUserIsAnonymous,
  currentUserIsSiteAdmin,
  file,
  filePath,
  ownerName,
  project,
  projectName,
  runtimeConfig,
  selectedBranch,
}: {
  currentUserIsAnonymous: boolean;
  currentUserIsSiteAdmin: boolean;
  file: CodeFile;
  filePath: string;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  const { t } = useLegacyMessages();
  const [isOpenInBrowserPopoverVisible, setIsOpenInBrowserPopoverVisible] = React.useState(false);
  const commitId = stringField(file.commitId, "");
  const shortCommitId = commitId.slice(0, 7);
  const isGit = project.vcs === "GIT";
  const selectedBranchItemName = branchItemName(selectedBranch);
  const authorLoginId = stringField(file.userLoginId, "");
  const hasViewableText = typeof file.data === "string" || typeof file.text === "string";
  const fileText = stringField(file.data, "") || stringField(file.text, "");
  const isBinary = booleanField(file.isBinary);
  const isTooLargeText = !isBinary && !hasViewableText && numberField(file.size) > 0;
  const mimeType = stringField(file.mimeType, "");
  const rawRevision = encodeURIComponent(isGit ? selectedBranchItemName : commitId);
  const rawPath = projectPath(ownerName, projectName, "rawcode", rawRevision, filePath);
  const rawHref = prefixBasePath(runtimeConfig.basePath, rawPath);
  const openPath = projectPath(ownerName, projectName, "files", rawRevision, filePath);
  const editPathWithSearch = `${projectPath(
    ownerName,
    projectName,
    "postform",
  )}?path=${filePath}&branch=${encodeURIComponent(selectedBranchItemName)}&edit=true`;
  const historyPath = projectPath(
    ownerName,
    projectName,
    "commits",
    encodeURIComponent(selectedBranch),
    filePath,
  );

  return (
    <div className="file-wrap" data-owner="project-code-file-wrap">
      <div className="file-header nm" data-owner="project-code-file-header">
        <div id="fileInfo" className="file-info" data-owner="project-code-file-info">
          <span id="commiter" className="commiter" data-owner="project-code-file-author">
            <Link
              to="/$user"
              params={{ user: authorLoginId }}
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
              className="avatar-wrap"
              title={authorLoginId}
            >
              <img src={stringField(file.avatarUrl, "")} alt="" width="32" height="32" />
            </Link>
            <Link
              to="/$user"
              params={{ user: authorLoginId }}
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
              className="ml5"
              data-owner="project-code-file-author-link"
            >
              {stringField(file.author, "")}
            </Link>
          </span>
          <span id="commitDate" className="commitDate" data-owner="project-code-file-date">
            {stringField(file.createdDate, "")}
          </span>
          <span id="revisionNo" className="revision" data-owner="project-code-file-revision">
            <Link
              to={projectPath(ownerName, projectName, "commit", commitId)}
              search={{ branch: selectedBranch }}
              hash={filePath}
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
            >
              {isGit ? shortCommitId : `Revision ${commitId}`}
              {numberField(file.commentCount) > 0 ? (
                <span
                  className="number-of-comments ml5"
                  data-owner="project-code-file-comment-count"
                >
                  <i className="yobicon-comments"></i> {numberField(file.commentCount)}
                </span>
              ) : null}
            </Link>
          </span>
          <span id="commitMessage" className="commitMsg" data-owner="project-code-file-message">
            {stringField(file.commitMessage, "")}
          </span>
          <span>{stringField(file.lineEnding, "")}</span>
        </div>
        <div className="pull-right" data-owner="project-code-file-actions">
          {!isBinary ? (
            <>
              <Link
                to={rawPath}
                reloadDocument
                className="ybtn"
                data-owner="project-code-file-raw-action"
                target="_blank"
              >
                <i className="yobicon-download-alt yobicon-white vmiddle"></i> Raw
              </Link>
              {!currentUserIsAnonymous ? (
                <Link
                  to={editPathWithSearch}
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
                  className="ybtn"
                  data-owner="project-code-file-edit-action"
                >
                  Edit
                </Link>
              ) : null}
            </>
          ) : null}
          <span
            className="open-in-browser-popover"
            data-owner="project-code-file-open-wrap"
            onBlur={() => setIsOpenInBrowserPopoverVisible(false)}
            onFocus={() => setIsOpenInBrowserPopoverVisible(true)}
            onMouseEnter={() => setIsOpenInBrowserPopoverVisible(true)}
            onMouseLeave={() => setIsOpenInBrowserPopoverVisible(false)}
          >
            <Link
              id="open-in-browser"
              to={openPath}
              reloadDocument
              className="ybtn"
              data-owner="project-code-file-open-action"
              target="_blank"
            >
              <i className="yobicon-download-alt yobicon-white vmiddle"></i> {t("code.open")}
            </Link>
            {isOpenInBrowserPopoverVisible ? (
              <div
                className="popover top in"
                data-owner="project-code-file-open-popover"
                role="tooltip"
              >
                <div className="arrow"></div>
                <div className="popover-content">{t("code.open.desc")}</div>
              </div>
            ) : null}
          </span>
          <Link
            to={historyPath}
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
            className="ybtn"
            data-owner="project-code-file-history-action"
          >
            {t("code.history")}
          </Link>
        </div>
      </div>
      {isBinary ? (
        mimeType.startsWith("image/") ? (
          <div id="showImage" className="image-wrap" data-owner="project-code-file-image">
            <img src={rawHref} alt="" />
          </div>
        ) : (
          <div id="showFile" className="file-wrap" data-owner="project-code-file-binary">
            <p>
              <strong className="filename">{filePath.split("/").pop() ?? filePath}</strong>
              <br />
              <span className="filesize" data-owner="project-code-file-size">
                {stringField(file.size, "")}
              </span>
              <br />
              <Link to={rawPath} reloadDocument className="filehref ybtn">
                <i className="yobicon-download-alt yobicon-white vmiddle"></i>{" "}
                {t("button.download")}
              </Link>
            </p>
          </div>
        )
      ) : isTooLargeText ? (
        <p>
          {t("code.tooBigFileForCodeBrowser", { args: [MAX_FILE_SIZE_CAN_BE_VIEWED] })}
          {currentUserIsSiteAdmin ? (
            <>
              <br />
              {t("code.looseFileSizeLimitForCodeBrowser")}
            </>
          ) : null}
          <br />
          <Link to={rawPath} reloadDocument target="_blank" className="filehref ybtn">
            {t("code.viewRaw")}
          </Link>
        </p>
      ) : isMarkdownPath(filePath) ? (
        <div
          id="codeVal"
          className="markdown-wrap codebrowser-markdown"
          data-owner="project-code-file-markdown"
        >
          <LegacyMarkdown>{fileText}</LegacyMarkdown>
        </div>
      ) : (
        <>
          <div id="codeVal" className="hidden">
            {fileText}
          </div>
          <CodeFileHighlighter
            className="code-wrap"
            code={fileText}
            data-mimetype={mimeType}
            data-owner="project-code-file-source"
            id="showCode"
            language={codeLanguage(mimeType, filePath)}
          />
        </>
      )}
    </div>
  );
}

type CodeFileHighlighterProps = Omit<React.ComponentPropsWithoutRef<"pre">, "children"> & {
  code: string;
  language?: string;
};

// Same outer DOM as the previous react-syntax-highlighter render:
// <pre id class data-mimetype data-owner><code class="code-content">tokens</code></pre>.
// Tokens now come from TanStack Highlight (escaped class-based markup).
function CodeFileHighlighter({ code, language, ...props }: CodeFileHighlighterProps) {
  injectMarkdownHighlightTheme();
  return (
    <pre {...props}>
      <code className="code-content">{highlightCodeToReactNodes(code, language)}</code>
    </pre>
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

function pathWithoutFileName(filePath: string) {
  const slash = filePath.lastIndexOf("/");
  return slash > 0 ? filePath.slice(0, slash) : "";
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

function branchItemName(branch: string) {
  const refsPrefix = "refs/";
  if (!branch.startsWith(refsPrefix)) {
    return branch;
  }
  const branchTypeEnd = branch.indexOf("/", refsPrefix.length);
  return branchTypeEnd === -1 ? branch : branch.slice(branchTypeEnd + 1);
}

function projectSearchScopeOrganizationName(
  project: ProjectContainer | undefined,
  ownerName: string,
) {
  if (!project) return undefined;
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  return project.isProtected === true;
}
