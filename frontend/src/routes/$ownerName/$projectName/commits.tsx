import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { codeHistoryQueryOptions, type CodeHistoryResponse } from "../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

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
  component: ProjectCodeHistoryRoute,
  validateSearch(search): ProjectCodeHistorySearch {
    const page = typeof search.page === "number" ? search.page : Number(search.page);
    return Number.isFinite(page) && page > 0 ? { page } : {};
  },
});

function ProjectCodeHistoryRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isProjectCodeHistoryRoot = pathname === `/${ownerName}/${projectName}/commits`;

  if (!isProjectCodeHistoryRoot) {
    return (
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectCodeHistoryTitle />
        <Outlet />
      </LegacyI18nProvider>
    );
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectCodeHistoryRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeHistoryRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
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

  if (!projectQuery.data) {
    return null;
  }

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks={isStandardProjectOwnedShell}
    >
      <ProjectCodeHistoryScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />
    </SiteLayoutShell>
  );
}

function ProjectCodeHistoryScreen({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { page = 0 } = Route.useSearch();
  const historyQuery = useQuery(
    codeHistoryQueryOptions(runtimeConfig, { ownerName, page, path: "", projectName }),
  );

  if (!historyQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectCodeHistoryTitle />
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={project} />
      <ProjectCodeHistoryBody history={historyQuery.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectCodeHistoryTitle() {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();

  return <title>{`${t("title.commitHistory")} - ${ownerName}/${projectName}`}</title>;
}

function ProjectCodeHistoryBody({
  history,
  runtimeConfig,
}: {
  history: CodeHistoryResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const { ownerName, projectName } = Route.useParams();
  const selectedBranch = history.selectedBranch;
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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap">
          <div className="code-browse-wrap">
            <select
              id="branches"
              data-format="branch"
              data-dropdown-css-class="branches"
              className="pull-right"
              defaultValue={selectedBranchHref}
              onChange={(event) => {
                router.history.push(event.currentTarget.value);
              }}
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
                  params={{ branch: "HEAD", ownerName, projectName }}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                >
                  {t("code.files")}
                </Link>
              </li>
              <li className="active">
                <Link
                  to="/$ownerName/$projectName/commits"
                  params={{ ownerName, projectName }}
                  search={{}}
                  activeOptions={legacyCodeHistoryLinkActiveOptions}
                  activeProps={legacyCodeHistoryLinkActiveProps}
                >
                  {t("code.commits")}
                </Link>
              </li>
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
                    history.commits.map((commit) => {
                      const showCommitPath = projectRoutePath(
                        ownerName,
                        projectName,
                        "commit",
                        commit.commitId,
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
                            <Link
                              to={showCommitPath}
                              search={{}}
                              activeOptions={legacyCodeHistoryLinkActiveOptions}
                              activeProps={legacyCodeHistoryLinkActiveProps}
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
                              message={commit.message}
                              shortMessage={commit.shortMessage}
                              to={showCommitPath}
                            />
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
  const avatarUrl = commit.authorAvatarUrl || "/assets/images/default-avatar-32.png";
  const usesGeneratedAvatar = avatarUrl === "/assets/images/default-avatar-32.png";

  if (commit.authorLoginId) {
    const authorPath = `/${commit.authorLoginId}` as "/";
    return (
      <Link
        to={authorPath}
        activeOptions={legacyCodeHistoryLinkActiveOptions}
        className="avatar-wrap"
        activeProps={legacyCodeHistoryLinkActiveProps}
        data-placement="top"
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
      <span className="avatar-wrap" data-placement="top" title={commit.authorEmail}>
        {/* oxlint-disable-next-line jsx-a11y/alt-text -- legacy email-only default avatar branch renders no alt/size attributes. */}
        <img src={avatarUrl} />
      </span>
    );
  }

  return <span>{commit.authorName || "Anonymous"}</span>;
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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
  if (organizationName) {
    return organizationName;
  }
  return project.isProtected === true ? ownerName : undefined;
}
