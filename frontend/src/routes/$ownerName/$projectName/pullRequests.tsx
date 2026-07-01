import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { HTMLAttributes } from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import {
  projectPullRequestListQueryOptions,
  type PullRequestListResponse,
} from "../../../api/pull-requests";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type ProjectPullRequestsSearch = {
  contributorId: number;
  filter: string;
  pageNum: number;
};

export const Route = createFileRoute("/$ownerName/$projectName/pullRequests")({
  component: ProjectPullRequestsRoute,
  validateSearch(search: Record<string, unknown>): ProjectPullRequestsSearch {
    return {
      contributorId: Number(search.contributorId) || 0,
      filter: typeof search.filter === "string" ? search.filter : "",
      pageNum: Number(search.pageNum) || 1,
    };
  },
});

function ProjectPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPullRequestsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const pullRequestsQuery = useQuery(
    projectPullRequestListQueryOptions(runtimeConfig, {
      category: "open",
      contributorId: search.contributorId,
      filter: search.filter,
      ownerName,
      pageNum: search.pageNum,
      projectName,
    }),
  );

  if (!projectQuery.data || !pullRequestsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="pullRequest"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
      <ProjectPullRequestsBody
        project={projectQuery.data}
        pullRequests={pullRequestsQuery.data}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </>
  );
}

function ProjectPullRequestsBody({
  project,
  pullRequests,
  runtimeConfig,
  search,
}: {
  project: ProjectContainer;
  pullRequests: PullRequestListResponse;
  runtimeConfig: RuntimeConfig;
  search: ProjectPullRequestsSearch;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, pullRequests.items[0]?.ownerName ?? "");
  const projectName = stringField(project.projectName, pullRequests.items[0]?.projectName ?? "");
  const pjaxContainer = { "pjax-container": "" } as unknown as HTMLAttributes<HTMLDivElement>;
  const openAction = projectPullRequestsHref(runtimeConfig.basePath, ownerName, projectName);
  const closedAction = prefixBasePath(
    runtimeConfig.basePath,
    `/${ownerName}/${projectName}/closedPullRequests`,
  );

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div {...pjaxContainer} className="row-fluid cb">
          <div className="left-menu span2 search-wrap hide-in-mobile" style={{ paddingTop: 0 }}>
            <form id="search" name="search" action={openAction} method="get">
              <div className="search">
                <div className="search-bar">
                  <input
                    name="filter"
                    className="textbox full"
                    type="text"
                    defaultValue={search.filter}
                  />
                  <button type="submit" className="search-btn">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </div>
              <div id="advanced-search-form" className="srch-advanced">
                <dl className="issue-option">
                  <dt>{t("pullRequest.sender")}</dt>
                  <dd>
                    <select
                      id="contributors"
                      name="contributorId"
                      data-format="user"
                      defaultValue={search.contributorId ? String(search.contributorId) : ""}
                    >
                      <option value="">{t("common.order.all")}</option>
                      {pullRequests.contributors.some(
                        (contributor) => contributor.userId === pullRequests.currentUserId,
                      ) ? (
                        <option value={pullRequests.currentUserId}>
                          {t("pullRequest.sentByMe")}
                        </option>
                      ) : null}
                      {pullRequests.contributors.map((contributor) => (
                        <option
                          value={contributor.userId}
                          data-avatar-url={contributor.avatarUrl}
                          data-login-id={contributor.loginId}
                          key={contributor.userId}
                        >
                          {contributor.userLabel}
                        </option>
                      ))}
                    </select>
                  </dd>
                </dl>
              </div>
            </form>
          </div>
          <div className="span10 span-hard-wrap" id="span10">
            <div className="pull-right">
              <a
                href={prefixBasePath(
                  runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/newPullRequestForm`,
                )}
                className="ybtn ybtn-success"
              >
                {t("pullRequest.new")}
              </a>
            </div>
            <ul className="nav nav-tabs nm pullrequeset-tab-menu">
              <li className="active">
                {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus data-url. */}
                <a href="#" data-url={openAction} data-type="state">
                  {t("pullRequest.state.open")}
                  <span className="num-badge">{pullRequests.openCount}</span>
                </a>
              </li>
              <li className="">
                {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus data-url. */}
                <a href="#" data-url={closedAction} data-type="state">
                  {t("pullRequest.state.closed")}
                  <span className="num-badge">{pullRequests.closedCount}</span>
                </a>
              </li>
              <li>
                <TwoColumnModeCheckbox />
              </li>
            </ul>
            <div className="tab-content" style={{ clear: "both", paddingTop: 15 }}>
              <div id="list" className="row-fluid tab-pane active">
                <ul className="post-list-wrap">
                  <div className="error-wrap">
                    <i className="ico ico-err1"></i>
                    <p>{t("pullRequest.is.empty")}</p>
                  </div>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TwoColumnModeCheckbox() {
  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title="Two Column Mode"
      data-content="Splits list and body into columns respectively"
    >
      <label className="checkbox" aria-label="Column View">
        <div className="two-column-icon-border">
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">Column View</span>
        </div>
      </label>
    </div>
  );
}

function projectPullRequestsHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}/pullRequests`);
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
