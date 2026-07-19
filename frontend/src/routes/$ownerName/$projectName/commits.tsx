import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { codeHistoryQueryOptions, type CodeHistoryResponse } from "../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { LastOutletTransition } from "../../-last-outlet-transition";
import { styles } from "./-commits.stylex";

type ProjectCodeHistorySearch = {
  page?: number;
};

const legacyCodeHistoryLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyCodeHistoryLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/$ownerName/$projectName/commits")({
  beforeLoad: ({ location, params }) => {
    if (location.pathname === `/${params.ownerName}/${params.projectName}/commits/`) {
      throw redirect({
        params: {
          ownerName: params.ownerName,
          projectName: params.projectName,
        },
        hash: location.hash,
        replace: true,
        search: {},
        statusCode: 303,
        to: "/$ownerName/$projectName/commits",
      });
    }
  },
  component: ProjectCodeHistoryRoute,
  validateSearch(search): ProjectCodeHistorySearch {
    const page = typeof search.page === "number" ? search.page : Number(search.page);
    return Number.isFinite(page) && page > 0 ? { page } : {};
  },
});

function ProjectCodeHistoryRoute() {
  return <LastOutletTransition routeId={Route.id} />;
}

export function ProjectCodeHistoryIndexScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  return <ProjectCodeHistoryScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />;
}

function ProjectCodeHistoryScreen({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { page = 0 } = Route.useSearch();
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, { ownerName, page, path: "", projectName }),
  );

  if (!project || !historyQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectCodeHistoryTitle />
      <ProjectCodeHistoryBody
        history={historyQuery.data}
        ownerName={ownerName}
        project={project}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectCodeHistoryTitle() {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();

  return <title>{`${t("title.commitHistory")} - ${ownerName}/${projectName}`}</title>;
}

export function ProjectCodeBranchHistoryRouteFrame({
  page,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  routeParams: { branch: string; ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ProjectCodeBranchHistoryRouteShell
      page={page}
      routeParams={routeParams}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectCodeBranchHistoryRouteShell({
  page,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  routeParams: { branch: string; ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, ownerName, projectName } = routeParams;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, { branch, ownerName, page, projectName }),
  );
  const project = projectQuery.data;
  if (!project || !historyQuery.data) return null;
  return (
    <ProjectCodeHistoryBody
      history={historyQuery.data}
      ownerName={ownerName}
      project={project}
      projectName={projectName}
      requestedBranch={branch}
      runtimeConfig={runtimeConfig}
    />
  );
}

export function ProjectCodeHistoryBody({
  history,
  ownerName,
  project,
  projectName,
  requestedBranch,
  runtimeConfig,
}: {
  history: CodeHistoryResponse;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
  requestedBranch?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const isGit = project.vcs === "GIT";
  const selectedBranch = history.selectedBranch;
  const displayedBranch =
    history.branches.find((item) => item.name === selectedBranch)?.name ??
    history.branches[0]?.name ??
    selectedBranch;
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const selectedBranchHref = selectedBranch
    ? projectHref(
        runtimeConfig.basePath,
        ownerName,
        projectName,
        "commits",
        encodeBranch(selectedBranch),
      )
    : undefined;

  return (
    <div className="page-wrap-outer" data-stylex-owner="project-commits-page">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap" data-stylex-owner="project-commits-shell">
          <div className="code-browse-wrap">
            <div
              className={`${stylex.props(styles.branchPicker).className} select2-container pull-right${branchMenuOpen ? " select2-dropdown-open select2-container-active" : ""}`}
              data-stylex-owner="project-commits-branch-picker"
            >
              <button
                type="button"
                className={`${stylex.props(styles.branchButton).className} select2-choice`}
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
                className={`${branchMenuOpen ? (stylex.props(styles.branchDropdown).className ?? "") : ""} select2-drop select2-display-none select2-with-searchbox branches${branchMenuOpen ? " select2-drop-active" : ""}`}
              >
                <div className="select2-search">
                  <input
                    type="text"
                    className={`select2-input${branchMenuOpen ? " select2-focused" : ""}`}
                    aria-label={t("title.branches")}
                  />
                </div>
                <ul className="select2-results">
                  {history.branches.map((item) => (
                    <li
                      key={item.name}
                      className={`select2-results-dept-0 select2-result select2-result-selectable${item.name === displayedBranch ? " select2-selected" : ""}`}
                    >
                      <button
                        type="button"
                        className={`${stylex.props(styles.branchButton).className} select2-result-label`}
                        onClick={() => {
                          setBranchMenuOpen(false);
                          router.history.push(
                            `${projectHref(
                              runtimeConfig.basePath,
                              ownerName,
                              projectName,
                              "commits",
                              encodeBranch(item.name),
                            )}/`,
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
              className="pull-right select2-offscreen"
              defaultValue={selectedBranchHref}
              onChange={(event) => {
                router.history.push(event.currentTarget.value);
              }}
            >
              {history.branches.map((item) => (
                <option
                  key={item.name}
                  value={`${projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "commits",
                    encodeBranch(item.name),
                  )}/`}
                >
                  {item.name}
                </option>
              ))}
            </select>

            <ul
              className={`${stylex.props(styles.tabs).className} nav nav-tabs`}
              data-stylex-owner="project-commits-tabs"
            >
              <li>
                <Link
                  to="/$ownerName/$projectName/code/$branch"
                  params={{ branch: requestedBranch || "HEAD", ownerName, projectName }}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                >
                  {t("code.files")}
                </Link>
              </li>
              <li className="active">
                {requestedBranch ? (
                  <Link
                    to="/$ownerName/$projectName/commits/$branch/$"
                    params={{ _splat: "/", branch: requestedBranch, ownerName, projectName }}
                    search={{ page: undefined as never }}
                    activeOptions={legacyCodeHistoryLinkActiveOptions}
                    activeProps={legacyCodeHistoryLinkActiveProps}
                  >
                    {t("code.commits")}
                  </Link>
                ) : (
                  <Link
                    to="/$ownerName/$projectName/commits"
                    params={{ ownerName, projectName }}
                    search={{}}
                    activeOptions={legacyCodeHistoryLinkActiveOptions}
                    activeProps={legacyCodeHistoryLinkActiveProps}
                  >
                    {t("code.commits")}
                  </Link>
                )}
              </li>
              {isGit ? (
                <li>
                  <Link
                    to="/$ownerName/$projectName/branches"
                    params={{ ownerName, projectName }}
                    activeOptions={legacyCodeHistoryLinkActiveOptions}
                    activeProps={legacyCodeHistoryLinkActiveProps}
                  >
                    {t("title.branches")}
                  </Link>
                </li>
              ) : null}
            </ul>

            <div
              id="history"
              className={`${stylex.props(styles.history).className} commit-wrap`}
              data-stylex-owner="project-commits-history"
            >
              <table
                className={`${stylex.props(styles.table).className} code-table commits`}
                data-stylex-owner="project-commits-table"
              >
                <thead className="thead">
                  <tr>
                    <td className="commit-id">
                      <strong>@</strong>
                    </td>
                    <td className="messages">
                      <strong>{t("code.commitMsg")}</strong>
                    </td>
                    <td className="date">
                      <strong>{t(isGit ? "code.authorDate" : "code.commitDate")}</strong>
                    </td>
                    <td className="author">
                      <strong>{t("code.author")}</strong>
                    </td>
                  </tr>
                </thead>
                <tbody className="tbody">
                  {history.commits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="warning-none">
                        {t("code.nocommits")}
                      </td>
                    </tr>
                  ) : (
                    history.commits.map((commit) => {
                      const showCommitPath = projectRoutePath(
                        ownerName,
                        projectName,
                        "commit",
                        commit.commitId,
                      );
                      return (
                        <tr key={commit.commitId}>
                          <td
                            className={`${stylex.props(styles.commitIdCell).className} commit-id`}
                            data-stylex-owner="project-commits-commit-id"
                          >
                            <button
                              type="button"
                              className="ybtn ybtn-mini btn-copy-commitId"
                              title={t("code.copyCommitId")}
                              data-commitid={commit.commitId}
                            >
                              <i className="yobicon-copy"></i>
                            </button>
                            <Link
                              to={showCommitPath}
                              search={{}}
                              activeOptions={legacyCodeHistoryLinkActiveOptions}
                              activeProps={legacyCodeHistoryLinkActiveProps}
                              title={t("code.showCommit")}
                              className={stylex.props(styles.commitIdLink).className}
                            >
                              {commit.commitShortId}
                            </Link>
                          </td>
                          <td
                            className={`${stylex.props(styles.messagesCell).className} messages`}
                            data-stylex-owner="project-commits-messages"
                          >
                            {commit.commentCount > 0 ? (
                              <span
                                className={`${stylex.props(styles.commentCount).className} number-of-comments`}
                                data-stylex-owner="project-commits-comment-count"
                              >
                                <i className="yobicon-comments"></i> {commit.commentCount}
                              </span>
                            ) : null}
                            <CommitMessage
                              message={commit.message}
                              shortMessage={commit.shortMessage}
                              to={showCommitPath}
                            />
                          </td>
                          <td
                            className={`${stylex.props(styles.dateCell).className} date`}
                            data-stylex-owner="project-commits-date"
                          >
                            {commit.authorDate}
                          </td>
                          <td
                            className={`${stylex.props(styles.authorCell).className} author`}
                            data-stylex-owner="project-commits-author"
                          >
                            <CommitAuthor basePath={runtimeConfig.basePath} commit={commit} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="actrow margin-top-20" data-stylex-owner="project-commits-pagination">
            {history.hasNewer ? (
              <Link
                to="/$ownerName/$projectName/commits"
                params={{ ownerName, projectName }}
                search={{ page: Math.max(0, history.page - 1) }}
                activeOptions={legacyCodeHistoryLinkActiveOptions}
                activeProps={legacyCodeHistoryLinkActiveProps}
                className="ybtn pull-left"
              >
                {t("code.newer")}
              </Link>
            ) : null}
            {history.hasOlder ? (
              <Link
                to="/$ownerName/$projectName/commits"
                params={{ ownerName, projectName }}
                search={{ page: history.page + 1 }}
                activeOptions={legacyCodeHistoryLinkActiveOptions}
                activeProps={legacyCodeHistoryLinkActiveProps}
                className="ybtn pull-left"
              >
                {t("code.older")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommitMessage({
  message,
  shortMessage,
  to,
}: {
  message: string;
  shortMessage: string;
  to: string;
}) {
  const { t } = useLegacyMessages();
  const lines = message.split("\n");
  const summary = shortMessage || t("code.commitMsg.empty");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Link
        to={to}
        search={{}}
        activeOptions={legacyCodeHistoryLinkActiveOptions}
        activeProps={legacyCodeHistoryLinkActiveProps}
        className={`${stylex.props(styles.commitMessage).className} commitMsg short`}
        data-stylex-owner="project-commits-message-summary"
      >
        {summary}
      </Link>
      {lines.length > 1 ? (
        <>
          <button
            type="button"
            className="commitMsg moreBtn"
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span>…</span>
          </button>
          <pre className={`commitMsg desc${isExpanded ? "" : " hidden"}`}>
            {lines.slice(1).join("\n")}
          </pre>
        </>
      ) : null}
    </>
  );
}

function CommitAuthor({
  basePath,
  commit,
}: {
  basePath: string;
  commit: CodeHistoryResponse["commits"][number];
}) {
  const { t } = useLegacyMessages();
  const usesGeneratedAvatar = !commit.authorAvatarUrl;
  const avatarUrl =
    commit.authorAvatarUrl || prefixBasePath(basePath, "/assets/images/default-avatar-32.png");

  if (commit.authorLoginId) {
    const authorPath = `/${commit.authorLoginId}` as "/";
    return (
      <Link
        to={authorPath}
        activeOptions={legacyCodeHistoryLinkActiveOptions}
        className="avatar-wrap"
        activeProps={legacyCodeHistoryLinkActiveProps}
        title={commit.authorLoginId}
      >
        {usesGeneratedAvatar ? (
          // oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes.
          <img src={avatarUrl} />
        ) : (
          <img
            src={avatarUrl}
            alt={commit.authorName || commit.authorLoginId}
            width="32"
            height="32"
          />
        )}
      </Link>
    );
  }

  if (commit.authorEmail) {
    return (
      <span className="avatar-wrap" title={commit.authorEmail}>
        {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy email-only default avatar branch renders no alt/size attributes. */}
        <img src={avatarUrl} />
      </span>
    );
  }

  return <span>{commit.authorName || t("user.role.anonymous")}</span>;
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(basePath, projectRoutePath(ownerName, projectName, ...parts));
}

function projectRoutePath(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}

function encodeBranch(branch: string) {
  return encodeURIComponent(branch);
}
