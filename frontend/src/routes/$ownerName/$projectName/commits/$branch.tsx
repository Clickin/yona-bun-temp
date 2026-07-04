import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { codeHistoryQueryOptions, type CodeHistoryResponse } from "../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/commits/$branch")({
  component: ProjectCodeHistoryRoute,
  validateSearch(search) {
    return {
      page: typeof search.page === "number" ? search.page : Number(search.page ?? 0) || 0,
    };
  },
});

function ProjectCodeHistoryRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { branch, ownerName, projectName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isProjectCodeHistoryRoot =
    pathname === `/${ownerName}/${projectName}/commits/${encodeURIComponent(branch)}`;

  if (!isProjectCodeHistoryRoot) {
    return <Outlet />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeHistoryScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeHistoryScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { branch, ownerName, projectName } = Route.useParams();
  const { page } = Route.useSearch();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, { branch, ownerName, page, path: "", projectName }),
  );

  if (!projectQuery.data || !historyQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectCodeHistoryBody history={historyQuery.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectCodeHistoryBody({
  history,
  runtimeConfig,
}: {
  history: CodeHistoryResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { branch, ownerName, projectName } = Route.useParams();
  const selectedBranch = history.selectedBranch || branch;
  const encodedBranch = encodeBranch(selectedBranch);
  const historyHref = projectHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    "commits",
    encodedBranch,
  );

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap">
          <div className="code-browse-wrap">
            <select
              id="branches"
              data-toggle="select2"
              data-format="branch"
              data-dropdown-css-class="branches"
              className="pull-right"
              defaultValue={historyHref}
            >
              {history.branches.map((item) => (
                <option
                  key={item.name}
                  value={projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "commits",
                    encodeBranch(item.name),
                  )}
                >
                  {item.name}
                </option>
              ))}
            </select>

            <ul className="nav nav-tabs" style={{ marginBottom: "20px" }}>
              <li>
                <Link
                  to="/$ownerName/$projectName/code/$branch"
                  params={{ branch: selectedBranch || "HEAD", ownerName, projectName }}
                  activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                  activeProps={{ className: undefined }}
                >
                  {t("code.files")}
                </Link>
              </li>
              <li className="active">
                <Link
                  to="/$ownerName/$projectName/commits/$branch"
                  params={{ branch: selectedBranch, ownerName, projectName }}
                  search={emptyHistorySearch()}
                  activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                  activeProps={{ className: undefined }}
                >
                  {t("code.commits")}
                </Link>
              </li>
              <li>
                <Link
                  to="/$ownerName/$projectName/branches"
                  params={{ ownerName, projectName }}
                  activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                  activeProps={{ className: undefined }}
                >
                  {t("title.branches")}
                </Link>
              </li>
            </ul>

            <div id="history" className="commit-wrap">
              <table className="code-table commits">
                <thead className="thead">
                  <tr>
                    <td className="commit-id">
                      <strong>@</strong>
                    </td>
                    <td className="messages">
                      <strong>{t("code.commitMsg")}</strong>
                    </td>
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
                    history.commits.map((commit) => (
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
                            to="/$ownerName/$projectName/commit/$commitId"
                            params={{ commitId: commit.commitId, ownerName, projectName }}
                            search={commitDetailSearch(selectedBranch)}
                            activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                            activeProps={{ className: undefined }}
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
                            commitId={commit.commitId}
                            message={commit.message}
                            ownerName={ownerName}
                            projectName={projectName}
                            selectedBranch={selectedBranch}
                            shortMessage={commit.shortMessage}
                          />
                        </td>
                        <td className="date">{commit.authorDate}</td>
                        <td className="author">
                          <CommitAuthor commit={commit} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="actrow margin-top-20">
            {history.hasNewer ? (
              <Link
                to="/$ownerName/$projectName/commits/$branch"
                params={{ branch: selectedBranch, ownerName, projectName }}
                search={{ page: Math.max(0, history.page - 1) }}
                activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                activeProps={{ className: undefined }}
                className="ybtn pull-left"
              >
                {t("code.newer")}
              </Link>
            ) : null}
            {history.hasOlder ? (
              <Link
                to="/$ownerName/$projectName/commits/$branch"
                params={{ branch: selectedBranch, ownerName, projectName }}
                search={{ page: history.page + 1 }}
                activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
                activeProps={{ className: undefined }}
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
  commitId,
  message,
  ownerName,
  projectName,
  selectedBranch,
  shortMessage,
}: {
  commitId: string;
  message: string;
  ownerName: string;
  projectName: string;
  selectedBranch: string;
  shortMessage: string;
}) {
  const { t } = useLegacyMessages();
  const lines = message.split("\n");
  const summary = shortMessage || t("code.commitMsg.empty");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Link
        to="/$ownerName/$projectName/commit/$commitId"
        params={{ commitId, ownerName, projectName }}
        search={commitDetailSearch(selectedBranch)}
        activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
        activeProps={{ className: undefined }}
        className="commitMsg short"
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
            <span>...</span>
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
  const avatarUrl = commit.authorAvatarUrl || "/assets/images/default-avatar-32.png";

  if (commit.authorLoginId) {
    return (
      <Link
        to="/$user"
        params={{ user: commit.authorLoginId }}
        search={emptyUserSearch()}
        activeOptions={{ exact: true, includeHash: true, includeSearch: true }}
        className="avatar-wrap"
        activeProps={{ className: undefined }}
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

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function emptyHistorySearch() {
  return { page: undefined } as never;
}

function commitDetailSearch(branch: string) {
  return { branch, path: undefined } as never;
}

function emptyUserSearch() {
  return {} as never;
}

function encodeBranch(branch: string) {
  return encodeURIComponent(branch);
}
