import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  codeBrowserQueryOptions,
  type CodeBrowserEntry,
  type CodeBrowserResponse,
} from "../../../../../api/code-browser";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import { currentSessionQueryOptions } from "../../../../../api/session";
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
        <ProjectCodeFileRouteShell routeParams={routeParams} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeFileRouteShell({
  routeParams,
  runtimeConfig,
}: {
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = routeParams;
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };
  const isStandardProjectOwnedShell = !projectSearchScope.organizationName;

  return (
    <>
      <title>{`${t("menu.code")} - ${ownerName}/${projectName}`}</title>
      <SiteLayoutShell
        projectSearchScope={projectSearchScope}
        runtimeConfig={runtimeConfig}
        showLegacyProjectHeaderLinks={isStandardProjectOwnedShell}
      >
        <ProjectCodeFileScreen
          project={projectQuery.data}
          routeParams={routeParams}
          runtimeConfig={runtimeConfig}
        />
      </SiteLayoutShell>
    </>
  );
}

function ProjectCodeFileScreen({
  project,
  routeParams,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  routeParams: ProjectCodeFileRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, filePath, ownerName, projectName } = routeParams;
  const codeQuery = useQuery(
    codeBrowserQueryOptions(runtimeConfig, { branch, ownerName, path: filePath, projectName }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));

  if (!project || !codeQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={project} />
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
  const { branch, filePath, ownerName, projectName } = routeParams;
  const selectedBranch = code.selectedBranch || branch;
  const selectedBranchItemName = branchItemName(selectedBranch);
  const encodedBranch = encodeURIComponent(selectedBranch);
  const encodedBranchItemName = encodeURIComponent(selectedBranchItemName);
  const isFolder = code.file === null;
  const newFilePath = isFolder ? `${filePath}/` : directoryPath(filePath);
  const isGit = project.vcs === "GIT";
  const archivePath = projectPath(ownerName, projectName, "archive", `${encodedBranch}.zip`);
  const archiveHref = prefixBasePath(runtimeConfig.basePath, archivePath);
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
            <div id="breadcrumbs" className="code-breadcrumb-wrap ml10 pull-left">
              <Link
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
                <div className="pull-right">
                  <Link href={archiveHref} to={archivePath} reloadDocument className="ybtn">
                    {t("code.download")}
                  </Link>
                </div>
                {!currentUserIsAnonymous ? (
                  <div className="pull-right">
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
            <div id="spin" style={{ position: "fixed", top: "50%", left: "50%" }}></div>
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
    <div className="list-wrap">
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
  const encodedBranch = encodeURIComponent(selectedBranch);

  return (
    <div id={rowId} className="row-fluid listitem">
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
          to={projectPath(ownerName, projectName, "code", encodedBranch, entry.path)}
          hash={entry.kind === "folder" ? rowId : undefined}
          className={entry.kind === "folder" ? "folder" : "file"}
          title={entry.name}
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
            to={projectPath(ownerName, projectName, "commit", entry.commitShortId)}
            search={{ branch: selectedBranch }}
          >
            {entry.commitMessage}
          </Link>
        </span>
      </div>
      <div className="span1 commitDate">{entry.commitDate}</div>
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
  const openHref = prefixBasePath(runtimeConfig.basePath, openPath);
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
    <div className="file-wrap">
      <div className="file-header nm">
        <div id="fileInfo" className="file-info">
          <span id="commiter" className="commiter">
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
            >
              {stringField(file.author, "")}
            </Link>
          </span>
          <span id="commitDate" className="commitDate">
            {stringField(file.createdDate, "")}
          </span>
          <span id="revisionNo" className="revision">
            <Link
              to="/$ownerName/$projectName/commit/$commitId"
              params={{ commitId, ownerName, projectName }}
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
              <Link href={rawHref} to={rawPath} className="ybtn" target="_blank">
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
                >
                  Edit
                </Link>
              ) : null}
            </>
          ) : null}
          <span
            className="open-in-browser-popover"
            style={{ display: "inline-block", position: "relative" }}
            onBlur={() => setIsOpenInBrowserPopoverVisible(false)}
            onFocus={() => setIsOpenInBrowserPopoverVisible(true)}
            onMouseEnter={() => setIsOpenInBrowserPopoverVisible(true)}
            onMouseLeave={() => setIsOpenInBrowserPopoverVisible(false)}
          >
            <Link
              id="open-in-browser"
              href={openHref}
              to={openPath}
              className="ybtn"
              target="_blank"
            >
              <i className="yobicon-download-alt yobicon-white vmiddle"></i> {t("code.open")}
            </Link>
            {isOpenInBrowserPopoverVisible ? (
              <div
                className="popover top in"
                role="tooltip"
                style={{
                  bottom: "100%",
                  display: "block",
                  left: "50%",
                  marginBottom: "5px",
                  position: "absolute",
                  transform: "translateX(-50%)",
                }}
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
              <Link href={rawHref} to={rawPath} reloadDocument className="filehref ybtn">
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
          <Link href={rawHref} to={rawPath} target="_blank" className="filehref ybtn">
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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
  if (organizationName) {
    return organizationName;
  }
  return project.isProtected === true ? ownerName : undefined;
}
