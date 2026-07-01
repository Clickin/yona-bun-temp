import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { codeHistoryQueryOptions, type CodeHistoryResponse } from "../../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
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

function ProjectCodeFileHistoryRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeFileHistoryScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeFileHistoryScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { branch, filePath, ownerName, projectName } = Route.useParams();
  const { page } = Route.useSearch();
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
      <ProjectCodeFileHistoryBody history={historyQuery.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectCodeFileHistoryBody({
  history,
  runtimeConfig,
}: {
  history: CodeHistoryResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { branch, filePath, ownerName, projectName } = Route.useParams();
  const selectedBranch = history.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);
  const historyHref = projectHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    "commits",
    encodedBranch,
    filePath,
  );

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap">
          <div className="code-browse-wrap">
            <div id="breadcrumbs" className="code-breadcrumb-wrap">
              <a
                href={projectHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  "commits",
                  encodedBranch,
                )}
              >
                {projectName}
              </a>
              {history.breadcrumbs.map((item) => (
                <a
                  href={projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "commits",
                    encodedBranch,
                    item.path,
                  )}
                  key={item.path}
                >
                  {item.name}
                </a>
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
                      const showCommitHref = commitHref(
                        runtimeConfig.basePath,
                        ownerName,
                        projectName,
                        commit.commitId,
                        selectedBranch,
                        filePath,
                      );
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
                            <a href={showCommitHref} title={t("code.showCommit")}>
                              {commit.commitShortId}
                            </a>
                          </td>
                          <td className="messages">
                            {commit.commentCount > 0 ? (
                              <span className="number-of-comments">
                                <i className="yobicon-comments"></i> {commit.commentCount}
                              </span>
                            ) : null}
                            <CommitMessage
                              href={showCommitHref}
                              message={commit.message}
                              shortMessage={commit.shortMessage}
                            />
                          </td>
                          <td className="browse">
                            <a
                              href={projectHref(
                                runtimeConfig.basePath,
                                ownerName,
                                projectName,
                                "code",
                                commit.commitShortId,
                                filePath,
                              )}
                              title={t("code.showCodeAtThisCommit")}
                              className="ybtn"
                            >
                              {t("code.showCode")}
                            </a>
                          </td>
                          <td className="date">{commit.authorDate}</td>
                          <td className="author">
                            <CommitAuthor commit={commit} runtimeConfig={runtimeConfig} />
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
              <a
                href={`${historyHref}?page=${Math.max(0, history.page - 1)}`}
                className="ybtn pull-left"
              >
                {t("code.newer")}
              </a>
            ) : null}
            {history.hasOlder ? (
              <a href={`${historyHref}?page=${history.page + 1}`} className="ybtn pull-left">
                {t("code.older")}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommitMessage({
  href,
  message,
  shortMessage,
}: {
  href: string;
  message: string;
  shortMessage: string;
}) {
  const { t } = useLegacyMessages();
  const lines = message.split("\n");
  const summary = shortMessage || t("code.commitMsg.empty");

  return (
    <>
      <a href={href} className="commitMsg short">
        {summary}
      </a>
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

function CommitAuthor({
  commit,
  runtimeConfig,
}: {
  commit: CodeHistoryResponse["commits"][number];
  runtimeConfig: RuntimeConfig;
}) {
  const avatarUrl = commit.authorAvatarUrl || "/assets/images/default-avatar-32.png";

  if (commit.authorLoginId) {
    return (
      <a
        href={prefixBasePath(runtimeConfig.basePath, `/${commit.authorLoginId}`)}
        className="avatar-wrap"
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
      </a>
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

function commitHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  commitId: string,
  branch: string,
  filePath: string,
) {
  const hash = filePath.replace(/\//gu, "-").replace(/\./gu, "-");
  return `${projectHref(basePath, ownerName, projectName, "commit", commitId)}?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(filePath)}#${hash}`;
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}
