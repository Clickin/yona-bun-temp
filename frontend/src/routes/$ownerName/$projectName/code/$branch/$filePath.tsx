import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
if (import.meta.env.DEV) {
  // Load Highlight.js CSS only in development to avoid StyleX verification errors
  import("highlight.js/styles/github.css");
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
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import legacySpriteUrl from "../../../../../assets/legacy/sprite.png";
import { codeBlameQueryOptions } from "../../../../../api/code";
import { styles } from "./-code-file.stylex";

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
    <div className="page-wrap-outer" data-stylex-owner="project-code-file-error-page">
      <div className="project-page-wrap">
        <div
          {...stylex.props(styles.errorWrap)}
          className={`${stylex.props(styles.errorWrap).className} error-wrap`}
          data-stylex-owner="project-code-file-error-wrap"
        >
          <i
            {...stylex.props(styles.errorIcon(legacySpriteUrl))}
            className={`${stylex.props(styles.errorIcon(legacySpriteUrl)).className} ico ico-err2`}
            data-stylex-owner="project-code-file-error-icon"
          ></i>
          <p
            {...stylex.props(styles.errorMessage)}
            data-stylex-owner="project-code-file-error-message"
          >
            {t("error.notfound.code", { args: [branch] })}
          </p>
          <Link
            to={projectPath(ownerName, projectName, "settingform")}
            className="ybtn ybtn-primary"
            data-stylex-owner="project-code-file-error-list"
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
  const { branch, filePath, ownerName, projectName } = routeParams;
  const selectedBranch = code.selectedBranch || branch;
  const selectedBranchItemName = branchItemName(selectedBranch);
  const encodedBranch = encodeURIComponent(selectedBranch);
  const encodedBranchItemName = encodeURIComponent(selectedBranchItemName);
  const isFolder = code.file === null;
  const newFilePath = isFolder ? `${filePath}/` : directoryPath(filePath);
  const isGit = project.vcs === "GIT";
  const archiveZipPath = projectPath(ownerName, projectName, "archive", `${encodedBranch}.zip`);
  const archiveTargzPath = `${projectPath(ownerName, projectName, "code", encodedBranch, "archive")}?format=tar.gz`;
  const breadcrumbsStyleProps = stylex.props(styles.breadcrumbs);
  const newFilePathWithSearch = `${projectPath(
    ownerName,
    projectName,
    "postform",
  )}?path=${newFilePath}&branch=${encodedBranchItemName}`;
  const branchPickerStyleProps = stylex.props(styles.branchPicker);
  const downloadActionStyleProps = stylex.props(styles.downloadAction);
  const newFileActionStyleProps = stylex.props(styles.newFileAction);

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
              {...branchPickerStyleProps}
              id="branches"
              data-format="branch"
              data-dropdown-css-class="branches"
              className={`${branchPickerStyleProps.className}${isFolder ? "" : " mb10"}`}
              data-stylex-owner="project-code-file-branch-picker"
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
              {...breadcrumbsStyleProps}
              id="breadcrumbs"
              className={`${breadcrumbsStyleProps.className} code-breadcrumb-wrap ml10 pull-left`}
              data-stylex-owner="project-code-file-breadcrumbs"
            >
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
                <div
                  {...downloadActionStyleProps}
                  data-stylex-owner="project-code-file-download-action"
                >
                  <Link to={archiveZipPath} reloadDocument className="ybtn">
                    {t("code.download")} (.zip)
                  </Link>
                  <Link to={archiveTargzPath} reloadDocument className="ybtn ml5">
                    .tar.gz
                  </Link>
                </div>
                {!currentUserIsAnonymous ? (
                  <div
                    {...newFileActionStyleProps}
                    data-stylex-owner="project-code-file-new-file-action"
                  >
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
              {...stylex.props(styles.spinner)}
              data-stylex-owner="project-code-file-spinner"
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
    <div
      {...stylex.props(styles.folderListWrap)}
      className={`${stylex.props(styles.folderListWrap).className} list-wrap`}
      data-stylex-owner="project-code-folder-list-wrap"
    >
      <div
        {...stylex.props(styles.folderRowFluid, styles.folderListHead)}
        className={`${stylex.props(styles.folderRowFluid, styles.folderListHead).className} row-fluid listhead`}
        data-stylex-owner="project-code-folder-list-head"
      >
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
        <div
          className={`${stylex.props(styles.noFiles).className} alert alert-warning nm`}
          data-stylex-owner="project-code-file-no-files"
        >
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
    <div
      {...stylex.props(styles.folderRow, styles.folderRowFluid)}
      id={rowId}
      className={`${stylex.props(styles.folderRow, styles.folderRowFluid).className} row-fluid listitem`}
      data-stylex-owner="project-code-folder-row"
    >
      <div
        {...stylex.props(styles.folderText, styles.folderFilename)}
        className={`${stylex.props(styles.folderText, styles.folderFilename).className} span6 filename`}
        data-stylex-owner="project-code-folder-filename"
      >
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
      <div
        {...stylex.props(styles.folderText, styles.folderCommitMessage)}
        className={`${stylex.props(styles.folderText, styles.folderCommitMessage).className} span5 commitMsg`}
        data-stylex-owner="project-code-folder-commit-message"
      >
        <span
          {...stylex.props(styles.folderCommitMessageWrapper)}
          className={`${stylex.props(styles.folderCommitMessageWrapper).className} ml5`}
          data-stylex-owner="project-code-folder-commit-message-wrapper"
        >
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
      <div
        {...stylex.props(styles.folderCommitDate)}
        className={`${stylex.props(styles.folderCommitDate).className} span1 commitDate`}
        data-stylex-owner="project-code-folder-commit-date"
      >
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
  const [isBlameActive, setIsBlameActive] = React.useState(false);
  const [copiedPermalink, setCopiedPermalink] = React.useState(false);
  const openBrowserWrapStyleProps = stylex.props(styles.openBrowserWrap);
  const commentCountStyleProps = stylex.props(styles.commentCount);
  const commitId = stringField(file.commitId, "");
  const shortCommitId = commitId.slice(0, 7);
  const isGit = project.vcs === "GIT";
  const selectedBranchItemName = branchItemName(selectedBranch);
  const authorLoginId = stringField(file.userLoginId, "");
  const hasViewableText = typeof file.data === "string" || typeof file.text === "string";
  const fileText = stringField(file.data, "") || stringField(file.text, "");
  const highlightedHtml = React.useMemo(() => {
    if (!fileText) return "";
    const result = hljs.highlightAuto(fileText);
    return result.value;
  }, [fileText]);
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

  const blameQuery = useQuery(
    codeBlameQueryOptions(runtimeConfig, {
      branch: selectedBranch,
      enabled: isBlameActive,
      filePath,
      ownerName,
      projectName,
    }),
  );

  return (
    <div
      className={`${stylex.props(styles.fileWrap).className} file-wrap`}
      data-stylex-owner="project-code-file-wrap"
    >
      <div
        className={`${stylex.props(styles.fileHeader).className} file-header nm`}
        data-stylex-owner="project-code-file-header"
      >
        <div
          id="fileInfo"
          className={`${stylex.props(styles.fileInfo).className} file-info`}
          data-stylex-owner="project-code-file-info"
        >
          <span id="commiter" className="commiter" data-stylex-owner="project-code-file-author">
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
              {...stylex.props(styles.authorLink)}
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
              className={`${stylex.props(styles.authorLink).className} ml5`}
              data-stylex-owner="project-code-file-author-link"
            >
              {stringField(file.author, "")}
            </Link>
          </span>
          <span id="commitDate" className="commitDate" data-stylex-owner="project-code-file-date">
            {stringField(file.createdDate, "")}
          </span>
          <span id="revisionNo" className="revision" data-stylex-owner="project-code-file-revision">
            <Link
              to="/$ownerName/$projectName/commit/$commitId"
              params={{ commitId, ownerName, projectName }}
              search={{ branch: selectedBranch, path: filePath }}
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
                  {...commentCountStyleProps}
                  className={`${commentCountStyleProps.className} ml5`}
                  data-stylex-owner="project-code-file-comment-count"
                >
                  <i className="yobicon-comments"></i> {numberField(file.commentCount)}
                </span>
              ) : null}
            </Link>
          </span>
          <span
            id="commitMessage"
            className="commitMsg"
            data-stylex-owner="project-code-file-message"
          >
            {stringField(file.commitMessage, "")}
          </span>
          <span>{stringField(file.lineEnding, "")}</span>
        </div>
        <div
          className={`${stylex.props(styles.fileActions).className} pull-right`}
          data-stylex-owner="project-code-file-actions"
        >
          {!isBinary ? (
            <>
              <button
                type="button"
                {...stylex.props(styles.action)}
                className={`${stylex.props(styles.action).className} ybtn${isBlameActive ? " active ybtn-info" : ""}`}
                data-stylex-owner="project-code-file-blame-action"
                onClick={() => setIsBlameActive(!isBlameActive)}
              >
                Blame
              </button>
              <button
                type="button"
                {...stylex.props(styles.action)}
                className={`${stylex.props(styles.action).className} ybtn`}
                data-stylex-owner="project-code-file-permalink-action"
                title="Copy commit permalink"
                onClick={() => {
                  if (commitId) {
                    const permalinkPath = projectPath(
                      ownerName,
                      projectName,
                      "code",
                      commitId,
                      filePath,
                    );
                    const fullUrl = `${location.origin}${prefixBasePath(
                      runtimeConfig.basePath,
                      permalinkPath,
                    )}`;
                    navigator.clipboard.writeText(fullUrl).catch(() => {});
                    setCopiedPermalink(true);
                    setTimeout(() => setCopiedPermalink(false), 2000);
                  }
                }}
              >
                {copiedPermalink ? "Copied!" : "Permalink"}
              </button>
              <Link
                {...stylex.props(styles.action)}
                to={rawPath}
                reloadDocument
                className={`${stylex.props(styles.action).className} ybtn`}
                data-stylex-owner="project-code-file-raw-action"
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
                  {...stylex.props(styles.action)}
                  className={`${stylex.props(styles.action).className} ybtn`}
                  data-stylex-owner="project-code-file-edit-action"
                >
                  Edit
                </Link>
              ) : null}
            </>
          ) : null}
          <span
            {...openBrowserWrapStyleProps}
            className={`open-in-browser-popover ${openBrowserWrapStyleProps.className ?? ""}`.trim()}
            data-stylex-owner="project-code-file-open-wrap"
            onBlur={() => setIsOpenInBrowserPopoverVisible(false)}
            onFocus={() => setIsOpenInBrowserPopoverVisible(true)}
            onMouseEnter={() => setIsOpenInBrowserPopoverVisible(true)}
            onMouseLeave={() => setIsOpenInBrowserPopoverVisible(false)}
          >
            <Link
              id="open-in-browser"
              to={openPath}
              reloadDocument
              {...stylex.props(styles.action)}
              className={`${stylex.props(styles.action).className} ybtn`}
              data-stylex-owner="project-code-file-open-action"
              target="_blank"
            >
              <i className="yobicon-download-alt yobicon-white vmiddle"></i> {t("code.open")}
            </Link>
            {isOpenInBrowserPopoverVisible ? (
              <div
                {...stylex.props(styles.popover)}
                className="popover top in"
                data-stylex-owner="project-code-file-open-popover"
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
            {...stylex.props(styles.action)}
            className={`${stylex.props(styles.action).className} ybtn`}
            data-stylex-owner="project-code-file-history-action"
          >
            {t("code.history")}
          </Link>
        </div>
      </div>
      {isBlameActive ? (
        <BlameView
          blame={blameQuery.data}
          filePath={filePath}
          isLoading={blameQuery.isLoading}
          ownerName={ownerName}
          projectName={projectName}
          selectedBranch={selectedBranch}
        />
      ) : isBinary ? (
        mimeType.startsWith("image/") ? (
          <div
            id="showImage"
            className={`${stylex.props(styles.imageWrap).className} image-wrap`}
            data-stylex-owner="project-code-file-image"
          >
            <img {...stylex.props(styles.image)} src={rawHref} alt="" />
          </div>
        ) : (
          <div
            id="showFile"
            className={`${stylex.props(styles.binaryFile).className} file-wrap`}
            data-stylex-owner="project-code-file-binary"
          >
            <p>
              <strong className="filename">{filePath.split("/").pop() ?? filePath}</strong>
              <br />
              <span
                className={`${stylex.props(styles.binarySize).className} filesize`}
                data-stylex-owner="project-code-file-size"
              >
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
          className={`${stylex.props(styles.markdown).className} markdown-wrap codebrowser-markdown`}
          data-stylex-owner="project-code-file-markdown"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileText}</ReactMarkdown>
        </div>
      ) : (
        <>
          <div id="codeVal" className="hidden">
            {fileText}
          </div>
          <pre
              id="showCode"
              className={`${stylex.props(styles.code).className} code-wrap`}
              data-stylex-owner="project-code-file-source"
              data-mimetype={mimeType}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            ></pre>
        </>
      )}
    </div>
  );
}

function BlameView({
  blame,
  filePath,
  isLoading,
  ownerName,
  projectName,
  selectedBranch,
}: {
  blame?: {
    lines: Array<{
      authorAvatarUrl: string;
      authorDate: string;
      authorEmail: string;
      authorName: string;
      commitId: string;
      commitMessage: string;
      commitShortId: string;
      content: string;
      lineNumber: number;
    }>;
  };
  filePath: string;
  isLoading: boolean;
  ownerName: string;
  projectName: string;
  selectedBranch: string;
}) {
  if (isLoading || !blame) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading blame data…</div>;
  }

  return (
    <table {...stylex.props(styles.blameTable)} data-stylex-owner="project-code-blame-table">
      <tbody>
        {blame.lines.map((line, index) => {
          const isFirstInBlock = index === 0 || blame.lines[index - 1].commitId !== line.commitId;
          return (
            <tr
              key={line.lineNumber}
              {...stylex.props(styles.blameRow)}
              id={`L${line.lineNumber}`}
              data-stylex-owner="project-code-blame-row"
            >
              <td
                {...stylex.props(
                  styles.blameMetaCell,
                  isFirstInBlock ? styles.blameMetaCellHeader : undefined,
                )}
                data-stylex-owner="project-code-blame-meta"
                title={`${line.authorName} (${line.authorEmail}): ${line.commitMessage}`}
              >
                {isFirstInBlock ? (
                  <>
                    {line.authorAvatarUrl ? (
                      <img
                        src={line.authorAvatarUrl}
                        alt=""
                        {...stylex.props(styles.blameAuthorAvatar)}
                      />
                    ) : null}
                    <Link
                      to="/$ownerName/$projectName/commit/$commitId"
                      params={{ commitId: line.commitId, ownerName, projectName }}
                      search={{ branch: selectedBranch, path: filePath }}
                      {...stylex.props(styles.blameCommitLink)}
                    >
                      {line.commitShortId}
                    </Link>
                    <span {...stylex.props(styles.blameAuthorLink)}>{line.authorName}</span>
                    <span {...stylex.props(styles.blameDate)}>{line.authorDate}</span>
                  </>
                ) : null}
              </td>
              <td
                {...stylex.props(styles.lineNumberCell)}
                data-stylex-owner="project-code-blame-linenumber"
              >
                <Link to="." hash={`L${line.lineNumber}`} {...stylex.props(styles.lineNumberLink)}>
                  {line.lineNumber}
                </Link>
              </td>
              <td
                {...stylex.props(styles.lineContentCell)}
                data-stylex-owner="project-code-blame-content"
              >
                {line.content}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
