import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import "./legacy-dynatree.css";
import { codeBrowserQueryOptions, type CodeBrowserResponse } from "../../../../api/code-browser";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { useLegacyMessages } from "../../../../i18n";
import { LastOutletTransition } from "../../../-last-outlet-transition";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { styles } from "../-code-branch.stylex";

export const Route = createFileRoute("/$ownerName/$projectName/code/$branch")({
  component: ProjectCodeBranchRoute,
});

function ProjectCodeBranchRoute() {
  return <LastOutletTransition routeId={Route.id} />;
}

export function ProjectCodeBranchIndexScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  return (
    <>
      <title>{`${t("menu.code")} - ${ownerName}/${projectName}`}</title>
      <ProjectCodeBranchScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectCodeBranchScreen({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, ownerName, projectName } = Route.useParams();
  const codeQuery = useQuery(
    codeBrowserQueryOptions(runtimeConfig, { branch, ownerName, path: "", projectName }),
  );

  if (!project || !codeQuery.data) {
    return null;
  }

  return (
    <ProjectCodeFolderBody code={codeQuery.data} project={project} runtimeConfig={runtimeConfig} />
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
  const displayedBranch =
    code.branches.find((item) => item.name === selectedBranch)?.name ??
    code.branches[0]?.name ??
    selectedBranch;
  const encodedBranch = encodeBranch(selectedBranch);
  const isGit = project.vcs === "GIT";
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  return (
    <div className="page-wrap-outer" data-stylex-owner="project-code-branch-page">
      <div className="project-page-wrap">
        <div className="code-browse-wrap" data-stylex-owner="project-code-branch-browser">
          <ul
            className={`${stylex.props(styles.tabs).className} nav nav-tabs`}
            data-stylex-owner="project-code-branch-tabs"
          >
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
                to="/$ownerName/$projectName/commits/$branch"
                params={{ branch: selectedBranch, ownerName, projectName }}
                search={{ page: undefined as never }}
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

          <div
            className={`${stylex.props(styles.header).className} code-browse-header`}
            data-stylex-owner="project-code-branch-header"
          >
            <div
              className={`${stylex.props(styles.picker).className} select2-container pull-left${branchMenuOpen ? " select2-dropdown-open select2-container-active" : ""}`}
              data-stylex-owner="project-code-branch-picker"
            >
              <button
                type="button"
                className={`${stylex.props(styles.pickerChoice).className} select2-choice`}
                aria-expanded={branchMenuOpen}
                onClick={() => setBranchMenuOpen((open) => !open)}
              >
                <span className="select2-chosen">
                  {isGit ? <strong className="branch-label branch">branch</strong> : null}
                  {isGit ? " " : null}
                  {displayedBranch}
                </span>
                <span className="select2-arrow" aria-hidden="true">
                  <b></b>
                </span>
              </button>
              <input
                className="select2-focusser select2-offscreen"
                type="text"
                disabled={branchMenuOpen}
                aria-label={t("title.branches")}
              />
              <div
                className={`select2-drop select2-display-none select2-with-searchbox branches${branchMenuOpen ? " select2-drop-active" : ""}`}
                style={branchMenuOpen ? { display: "block", width: 220 } : undefined}
              >
                <div className="select2-search">
                  <input
                    type="text"
                    className={`select2-input${branchMenuOpen ? " select2-focused" : ""}`}
                    aria-label={t("title.branches")}
                  />
                </div>
                <ul className="select2-results">
                  {code.branches.map((item) => (
                    <li
                      key={item.name}
                      className={`select2-results-dept-0 select2-result select2-result-selectable${item.name === displayedBranch ? " select2-selected" : ""}`}
                    >
                      <button
                        type="button"
                        className={`${stylex.props(styles.pickerChoice).className} select2-result-label`}
                        onClick={() => {
                          setBranchMenuOpen(false);
                          router.history.push(
                            projectHref(
                              runtimeConfig.basePath,
                              ownerName,
                              projectName,
                              "code",
                              encodeBranch(item.name),
                            ),
                          );
                        }}
                      >
                        {isGit ? <strong className="branch-label branch">branch</strong> : null}
                        {isGit ? " " : null}
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <select
              id="branches"
              data-format="branch"
              data-dropdown-css-class="branches"
              className="pull-left select2-offscreen"
              tabIndex={-1}
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
            <div
              id="breadcrumbs"
              className={`${stylex.props(styles.breadcrumbs).className} code-breadcrumb-wrap ml10 pull-left`}
              data-stylex-owner="project-code-branch-breadcrumbs"
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
                to={projectRoute(ownerName, projectName, "code", encodedBranch)}
                hash="code-browser-active-sentinel"
                mask={{ to: projectRoute(ownerName, projectName, "code", encodedBranch) }}
              >
                {projectName}
              </Link>
              {code.path === "" ? (
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
                ></Link>
              ) : null}
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

          <div
            className={`${stylex.props(styles.list).className} code-viewer-wrap`}
            data-stylex-owner="project-code-branch-viewer"
          >
            <div
              {...stylex.props(styles.spinner)}
              data-stylex-owner="project-code-branch-spinner"
              id="spin"
            ></div>
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
    <div
      className={`${stylex.props(styles.list).className} list-wrap`}
      data-stylex-owner="project-code-branch-list"
    >
      <div
        className={`${stylex.props(styles.listHeader).className} row-fluid listhead`}
        data-stylex-owner="project-code-branch-list-header"
      >
        <div className={`${stylex.props(styles.listHeaderFilename).className} span6 filename`}>
          <strong>{t("code.filename")}</strong>
        </div>
        <div className="span4 commitMsg">
          <strong>{t("code.commitMsg")}</strong>
        </div>
        <div className={`${stylex.props(styles.listHeaderDate).className} span2 commitDate`}>
          <strong>{t("code.commitDate")}</strong>
        </div>
      </div>

      {code.entries.length === 0 ? (
        <div
          className={`${stylex.props(styles.empty).className} alert alert-warning nm`}
          data-stylex-owner="project-code-branch-empty"
        >
          {t("code.nofiles")}
        </div>
      ) : null}

      {[...folders, ...files].map((entry) => (
        <div
          id={`cb-${entry.path}`}
          className={`${stylex.props(styles.listRow).className} row-fluid listitem`}
          data-stylex-owner="project-code-branch-list-row"
          key={entry.path}
        >
          <div className={`${stylex.props(styles.listFilename).className} span6 filename`}>
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
              className={entry.kind === "folder" ? "dynatree-ico-cf" : "dynatree-ico-c"}
              title={entry.name}
            >
              <span className="dynatree-icon vmiddle"></span>
              {entry.name}
            </Link>
          </div>
          <div className={`${stylex.props(styles.listMessage).className} span5 commitMsg`}>
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
          <div className={`${stylex.props(styles.listDate).className} span1 commitDate`}>
            {formatCodeCommitDate(entry.commitDate, t)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCodeCommitDate(
  value: string,
  t: ReturnType<typeof useLegacyMessages>["t"],
  now = Date.now(),
) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  const elapsedMilliseconds = Math.max(0, now - timestamp);
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1_000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 8) {
    if (elapsedDays > 0) return t(timeMessageKey("day", elapsedDays), { args: [elapsedDays] });
    if (elapsedHours > 0) return t(timeMessageKey("hour", elapsedHours), { args: [elapsedHours] });
    if (elapsedMinutes > 0)
      return t(timeMessageKey("minute", elapsedMinutes), { args: [elapsedMinutes] });
    if (elapsedSeconds > 0)
      return t(timeMessageKey("second", elapsedSeconds), { args: [elapsedSeconds] });
    return t("common.time.just");
  }

  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() === new Date(now).getFullYear()
    ? `${month}-${day}`
    : `${date.getFullYear()}-${month}-${day}`;
}

function timeMessageKey(unit: "day" | "hour" | "minute" | "second", count: number) {
  return `common.time.${unit}${count === 1 ? "" : "s"}`;
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
