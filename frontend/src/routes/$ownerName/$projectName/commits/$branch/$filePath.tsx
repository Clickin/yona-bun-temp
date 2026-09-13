import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { codeHistoryQueryOptions, type CodeHistoryResponse } from "../../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer } from "../../../../../api/types";
import { useLegacyMessages } from "../../../../../i18n";
import { type RuntimeConfig } from "../../../../../runtime-config";
import { useRootToast } from "../../../../__root";

export const Route = createFileRoute("/$ownerName/$projectName/commits/$branch/$filePath")({
  component: ProjectCodeFileHistoryRoute,
  validateSearch(search) {
    return {
      page: typeof search.page === "number" ? search.page : Number(search.page ?? 0) || 0,
    };
  },
});

export type ProjectCodeFileHistoryRouteParams = {
  branch: string;
  filePath: string;
  ownerName: string;
  projectName: string;
};

const legacyActiveMarkerSuppressionProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

function ProjectCodeFileHistoryRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const routeParams = Route.useParams();
  const { page } = Route.useSearch();
  return (
    <ProjectCodeFileHistoryRouteShell
      page={page}
      routeParams={routeParams}
      runtimeConfig={runtimeConfig}
    />
  );
}

export function ProjectCodeFileHistoryRouteFrame({
  page,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  routeParams: ProjectCodeFileHistoryRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ProjectCodeFileHistoryRouteShell
      page={page}
      routeParams={routeParams}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectCodeFileHistoryRouteShell({
  page,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  routeParams: ProjectCodeFileHistoryRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = routeParams;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  return (
    <ProjectCodeFileHistoryScreen
      page={page}
      project={projectQuery.data}
      routeParams={routeParams}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectCodeFileHistoryScreen({
  page,
  project,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  project: ProjectContainer | undefined;
  routeParams: ProjectCodeFileHistoryRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, filePath, ownerName, projectName } = routeParams;
  const { t } = useLegacyMessages();
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, {
      branch,
      ownerName,
      page,
      path: filePath,
      projectName,
    }),
  );

  if (!project || !historyQuery.data) {
    return null;
  }

  return (
    <>
      <title>{`${t("title.commitHistory")} - ${ownerName}/${projectName}`}</title>
      <ProjectCodeFileHistoryBody history={historyQuery.data} routeParams={routeParams} />
    </>
  );
}

function ProjectCodeFileHistoryBody({
  history,
  routeParams,
}: {
  history: CodeHistoryResponse;
  routeParams: ProjectCodeFileHistoryRouteParams;
}) {
  const { t } = useLegacyMessages();
  const setRootToast = useRootToast();
  const copyToastCounterRef = useRef(0);
  const { branch, filePath, ownerName, projectName } = routeParams;
  const selectedBranch = history.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);
  const historyPath = projectRoutePath(ownerName, projectName, "commits", encodedBranch, filePath);

  const copyCommitId = async (commitId: string) => {
    copyToastCounterRef.current += 1;
    const toastKey = `copy-commit-id:${commitId}:${copyToastCounterRef.current}`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is not available.");
      }
      await navigator.clipboard.writeText(commitId);
      setRootToast({
        durationMs: 1000,
        key: toastKey,
        message: t("code.copyCommitId.copied"),
      });
    } catch {
      setRootToast({
        key: `${toastKey}:error`,
        message: t("site.features.error.clipboard"),
      });
    }
  };

  return (
    <div className="page-wrap-outer" data-owner="commit-file-page">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap" data-owner="commit-file-repo">
          <div className="code-browse-wrap" data-owner="commit-file-browse">
            <div
              className="code-breadcrumb-wrap"
              data-owner="commit-file-breadcrumbs"
              id="breadcrumbs"
            >
              <Link
                to={projectRoutePath(ownerName, projectName, "commits", encodedBranch)}
                activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                activeProps={legacyActiveMarkerSuppressionProps}
              >
                {projectName}
              </Link>
              {history.breadcrumbs.map((item) => (
                <Link
                  to={projectRoutePath(ownerName, projectName, "commits", encodedBranch, item.path)}
                  activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                  activeProps={legacyActiveMarkerSuppressionProps}
                  key={item.path}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="commit-wrap" data-owner="commit-file-history" id="history">
              <table className="code-table commits mt10" data-owner="commit-file-history-table">
                <thead className="thead">
                  <tr>
                    <td className="commit-id">
                      <strong>@</strong>
                    </td>
                    <td className="messages">
                      <strong>{t("code.commitMsg")}</strong>
                    </td>
                    <td className="browse"></td>
                    <td className="date">
                      <strong>{t("code.authorDate")}</strong>
                    </td>
                    <td className="author">
                      <strong>{t("code.author")}</strong>
                    </td>
                  </tr>
                </thead>
                <tbody className="tbody">
                  {history.commits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="warning-none"
                        data-owner="commit-file-empty-warning"
                      >
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
                      const showCommitSearch = { branch: selectedBranch, path: filePath };
                      const showCommitHash = codePathHash(filePath);
                      return (
                        <tr key={commit.commitId}>
                          <td className="commit-id">
                            <button
                              type="button"
                              className="ybtn ybtn-mini btn-copy-commitId"
                              title={t("code.copyCommitId")}
                              data-commitid={commit.commitId}
                              onClick={() => void copyCommitId(commit.commitId)}
                            >
                              <i className="yobicon-copy"></i>
                            </button>
                            <Link
                              to={showCommitPath}
                              search={showCommitSearch}
                              hash={showCommitHash}
                              activeOptions={{
                                exact: true,
                                includeHash: true,
                                includeSearch: true,
                              }}
                              activeProps={legacyActiveMarkerSuppressionProps}
                              title={t("code.showCommit")}
                            >
                              {commit.commitShortId}
                            </Link>
                          </td>
                          <td className="messages">
                            {commit.commentCount > 0 ? (
                              <span
                                className="number-of-comments"
                                data-owner="commit-file-comment-count"
                              >
                                <i className="yobicon-comments"></i> {commit.commentCount}
                              </span>
                            ) : null}
                            <CommitMessage
                              hash={showCommitHash}
                              message={commit.message}
                              search={showCommitSearch}
                              shortMessage={commit.shortMessage}
                              to={showCommitPath}
                            />
                          </td>
                          <td className="browse">
                            <Link
                              to={projectRoutePath(
                                ownerName,
                                projectName,
                                "code",
                                commit.commitShortId,
                                filePath,
                              )}
                              title={t("code.showCodeAtThisCommit")}
                              className="ybtn"
                              activeOptions={{
                                exact: true,
                                includeHash: true,
                                includeSearch: true,
                              }}
                              activeProps={legacyActiveMarkerSuppressionProps}
                            >
                              {t("code.showCode")}
                            </Link>
                          </td>
                          <td className="date">{commit.authorDate}</td>
                          <td className="author">
                            <CommitAuthor commit={commit} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="actrow margin-top-20">
            {history.hasNewer ? (
              <Link
                to={historyPath}
                search={{ page: Math.max(0, history.page - 1) }}
                className="ybtn"
                data-owner="commit-file-history-pagination-newer"
                activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                activeProps={legacyActiveMarkerSuppressionProps}
              >
                {t("code.newer")}
              </Link>
            ) : null}
            {history.hasOlder ? (
              <Link
                to={historyPath}
                search={{ page: history.page + 1 }}
                className="ybtn"
                data-owner="commit-file-history-pagination-older"
                activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                activeProps={legacyActiveMarkerSuppressionProps}
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
  hash,
  message,
  search,
  shortMessage,
  to,
}: {
  hash: string;
  message: string;
  search: { branch: string; path: string };
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
        search={search}
        hash={hash}
        className="commitMsg short"
        activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
        activeProps={legacyActiveMarkerSuppressionProps}
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

function CommitAuthor({ commit }: { commit: CodeHistoryResponse["commits"][number] }) {
  const { t } = useLegacyMessages();
  const avatarUrl = commit.authorAvatarUrl || "/assets/images/default-avatar-32.png";
  const usesGeneratedAvatar = avatarUrl === "/assets/images/default-avatar-32.png";

  if (commit.authorLoginId) {
    const authorPath = `/${commit.authorLoginId}` as "/";
    return (
      <Link
        to={authorPath}
        className="avatar-wrap"
        activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
        activeProps={legacyActiveMarkerSuppressionProps}
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

function codePathHash(filePath: string) {
  return filePath.replace(/\//gu, "-").replace(/\./gu, "-");
}

function projectRoutePath(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}
