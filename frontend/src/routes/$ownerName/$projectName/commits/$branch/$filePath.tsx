import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { codeHistoryQueryOptions, type CodeHistoryResponse } from "../../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { type RuntimeConfig } from "../../../../../runtime-config";
import { SiteLayoutShell } from "../../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../../$projectName";

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
    <ProjectCodeFileHistoryRouteFrame
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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeFileHistoryScreen
            page={page}
            routeParams={routeParams}
            runtimeConfig={runtimeConfig}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeFileHistoryScreen({
  page,
  routeParams,
  runtimeConfig,
}: {
  page: number;
  routeParams: ProjectCodeFileHistoryRouteParams;
  runtimeConfig: RuntimeConfig;
}) {
  const { branch, filePath, ownerName, projectName } = routeParams;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, {
      branch,
      ownerName,
      page,
      path: filePath,
      projectName,
    }),
  );

  if (!projectQuery.data || !historyQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
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
  const { branch, filePath, ownerName, projectName } = routeParams;
  const selectedBranch = history.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);
  const historyPath = projectRoutePath(ownerName, projectName, "commits", encodedBranch, filePath);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap">
          <div className="code-browse-wrap">
            <div id="breadcrumbs" className="code-breadcrumb-wrap">
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

            <div id="history" className="commit-wrap">
              <table className="code-table commits mt10">
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
                              <span className="number-of-comments">
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
                className="ybtn pull-left"
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
                className="ybtn pull-left"
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
          <button type="button" className="commitMsg moreBtn">
            <span>...</span>
          </button>
          <pre className="commitMsg desc hidden">{lines.slice(1).join("\n")}</pre>
        </>
      ) : null}
    </>
  );
}

function CommitAuthor({ commit }: { commit: CodeHistoryResponse["commits"][number] }) {
  const avatarUrl = commit.authorAvatarUrl || "/assets/images/default-avatar-32.png";

  if (commit.authorLoginId) {
    const authorPath = `/${commit.authorLoginId}` as "/";
    return (
      <Link
        to={authorPath}
        className="avatar-wrap"
        activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
        activeProps={legacyActiveMarkerSuppressionProps}
        data-toggle="tooltip"
        data-placement="top"
        title={commit.authorLoginId}
      >
        <img
          src={avatarUrl}
          alt={commit.authorName || commit.authorLoginId}
          width="32"
          height="32"
        />
      </Link>
    );
  }

  if (commit.authorEmail) {
    return (
      <span
        className="avatar-wrap"
        data-toggle="tooltip"
        data-placement="top"
        title={commit.authorEmail}
      >
        <img src={avatarUrl} alt={commit.authorEmail} width="32" height="32" />
      </span>
    );
  }

  return <span>{commit.authorName || "Anonymous"}</span>;
}

function codePathHash(filePath: string) {
  return filePath.replace(/\//gu, "-").replace(/\./gu, "-");
}

function projectRoutePath(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}
