import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { HTMLAttributes, LiHTMLAttributes } from "react";
import { readOrganizationContainerRest } from "../../../api/org-project";
import {
  organizationPullRequestListQueryOptions,
  type PullRequestListItem,
  type PullRequestListResponse,
} from "../../../api/pull-requests";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export type OrganizationPullRequestsSearch = {
  filter: string;
  pageNum: number;
};

export type OrganizationPullRequestsCategory = "closed" | "open";

export const Route = createFileRoute("/organizations/$organizationName/pullrequests")({
  component: OrganizationPullRequestsRoute,
  validateSearch(search: Record<string, unknown>): OrganizationPullRequestsSearch {
    return {
      filter: typeof search.filter === "string" ? search.filter : "",
      pageNum: Number(search.pageNum) || 1,
    };
  },
});

function OrganizationPullRequestsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { organizationName } = Route.useParams();
  const search = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationPullRequestsPage
            category="open"
            organizationName={organizationName}
            runtimeConfig={runtimeConfig}
            search={search}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

export function OrganizationPullRequestsPage({
  category,
  organizationName,
  runtimeConfig,
  search,
}: {
  category: OrganizationPullRequestsCategory;
  organizationName: string;
  runtimeConfig: RuntimeConfig;
  search: OrganizationPullRequestsSearch;
}) {
  const organizationQuery = useQuery({
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });
  const pullRequestsQuery = useQuery(
    organizationPullRequestListQueryOptions(runtimeConfig, {
      category,
      organizationName,
      ...search,
    }),
  );

  if (!organizationQuery.data || !pullRequestsQuery.data) {
    return null;
  }

  return (
    <OrganizationPullRequestsBody
      organization={organizationQuery.data}
      pullRequests={pullRequestsQuery.data}
      runtimeConfig={runtimeConfig}
      search={search}
      selectedCategory={category}
    />
  );
}

function OrganizationPullRequestsBody({
  organization,
  pullRequests,
  runtimeConfig,
  search,
  selectedCategory,
}: {
  organization: OrganizationContainer;
  pullRequests: PullRequestListResponse;
  runtimeConfig: RuntimeConfig;
  search: OrganizationPullRequestsSearch;
  selectedCategory: OrganizationPullRequestsCategory;
}) {
  const { t } = useLegacyMessages();
  const organizationName = stringField(organization.organizationName, "");
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const pjaxContainer = { "pjax-container": "" } as unknown as HTMLAttributes<HTMLDivElement>;
  const openAction = prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}/pullrequests`,
  );
  const closedAction = prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}/closedPullrequests`,
  );
  const searchAction = selectedCategory === "closed" ? closedAction : openAction;

  return (
    <>
      <OrganizationHeader
        basePath={runtimeConfig.basePath}
        logoUrl={logoUrl}
        organizationName={organizationName}
      />
      <OrganizationMenu
        active="pullrequests"
        basePath={runtimeConfig.basePath}
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div {...pjaxContainer} className="row-fluid cb">
            <div className="left-menu span2 search-wrap hide-in-mobile" style={{ paddingTop: 0 }}>
              <form id="search" name="search" action={searchAction} method="get">
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
              </form>
            </div>
            <div className="span10 span-hard-wrap" id="span10">
              <ul className="nav nav-tabs nm pullrequeset-tab-menu">
                <li className={selectedCategory === "open" ? "active" : ""}>
                  {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus data-url. */}
                  <a href="#" data-url={openAction} data-type="state">
                    {t("pullRequest.state.open")}
                    <span className="num-badge">{pullRequests.openCount}</span>
                  </a>
                </li>
                <li className={selectedCategory === "closed" ? "active" : ""}>
                  {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy tab uses href="#" plus data-url. */}
                  <a href="#" data-url={closedAction} data-type="state">
                    {t("pullRequest.state.closed")}
                    <span className="num-badge">{pullRequests.closedCount}</span>
                  </a>
                </li>
              </ul>
              <div className="tab-content" style={{ clear: "both", paddingTop: 15 }}>
                <div id="list" className="row-fluid tab-pane active">
                  <OrganizationPullRequestList
                    basePath={runtimeConfig.basePath}
                    items={pullRequests.items}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OrganizationPullRequestList({
  basePath,
  items,
}: {
  basePath: string;
  items: PullRequestListItem[];
}) {
  const { t } = useLegacyMessages();

  return (
    <ul className="post-list-wrap">
      {items.length > 0 ? (
        <>
          {items.map((pullRequest) => (
            <OrganizationPullRequestItem
              basePath={basePath}
              key={pullRequest.id || pullRequest.pullRequestNumber}
              pullRequest={pullRequest}
            />
          ))}
          <div id="pagination"></div>
        </>
      ) : (
        <div className="error-wrap">
          <i className="ico ico-err1"></i>
          <p>{t("pullRequest.is.empty")}</p>
        </div>
      )}
    </ul>
  );
}

function OrganizationPullRequestItem({
  basePath,
  pullRequest,
}: {
  basePath: string;
  pullRequest: PullRequestListItem;
}) {
  const { t } = useLegacyMessages();
  const projectHref = prefixBasePath(
    basePath,
    `/${pullRequest.ownerName}/${pullRequest.projectName}`,
  );
  const pullRequestHref = `${projectHref}/pullRequest/${pullRequest.pullRequestNumber}`;
  const changesHref = `${pullRequestHref}/changes`;
  const contributorHref = prefixBasePath(basePath, `/${pullRequest.contributorLoginId}`);
  const receiverHref = prefixBasePath(basePath, `/${pullRequest.receiverLoginId}`);
  const percent = percentOf(pullRequest.closedCommentThreadCount, pullRequest.commentThreadCount);
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const legacyHref = { href: pullRequestHref } as unknown as LiHTMLAttributes<HTMLLIElement>;

  return (
    <li className="post-item title" {...legacyHref}>
      <div className="span10 span-hard-wrap">
        <a
          href={contributorHref}
          className="avatar-wrap mlarge"
          data-toggle="tooltip"
          data-placement="top"
          title={pullRequest.contributorLoginId}
        >
          <img src="/assets/images/default-avatar-32.png" alt="" />
        </a>
        <div className="title-wrap">
          <span className="post-id">{pullRequest.pullRequestNumber}</span>
          <a href={pullRequestHref} className={`title ${pullRequest.conflict ? "conflict" : ""}`}>
            {pullRequest.title}
          </a>
        </div>
        <div className="infos">
          {pullRequest.contributorLabel ? (
            <a
              href={contributorHref}
              className="infos-item infos-link-item"
              data-toggle="tooltip"
              data-placement="top"
              title={pullRequest.contributorLoginId}
            >
              {pullRequest.contributorLabel}
            </a>
          ) : (
            <span className="infos-item">{t("issue.noAuthor")}</span>
          )}
          <span className="infos-item" title={pullRequest.createdLabel}>
            {pullRequest.createdLabel}
          </span>
          <a href={projectHref} className="infos-link-item group-project-name">
            {pullRequest.projectName}
          </a>
          {pullRequest.commentThreadCount > 0 ? (
            <div className="infos-item" style={{ marginRight: 20 }}>
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div className="upload-progress">
                <div className="bar orange" style={{ width: `${percent}%` }}></div>
              </div>
              <a
                href={changesHref}
                data-toggle="tooltip"
                title={`${t("pullRequest.review.closed")} / ${t("pullRequest.review.total")}`}
              >
                <span>{pullRequest.closedCommentThreadCount}</span>
                <span className="gray-txt">/</span>
                <span className="size total">{pullRequest.commentThreadCount}</span>
              </a>
            </div>
          ) : null}
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div className="mt5 pull-right hide-in-mobile">
          {pullRequest.receiverLoginId ? (
            <a
              href={receiverHref}
              className="avatar-wrap assinee"
              data-toggle="tooltip"
              data-placement="top"
              title=""
              data-original-title={pullRequest.receiverLabel}
            >
              <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
            </a>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        <div className={`state ${stateKey} pull-right`}>{t(`pullRequest.state.${stateKey}`)}</div>
      </div>
    </li>
  );
}

function OrganizationHeader({
  basePath,
  logoUrl,
  organizationName,
}: {
  basePath: string;
  logoUrl: string;
  organizationName: string;
}) {
  return (
    <div className="project-header-outer" style={{ backgroundImage: `url('${logoUrl}')` }}>
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className="project-breadcrumb-wrap">
            <div className="project-breadcrumb">
              <span className="project-author">
                <span className="group-title-head">group</span>
                <a href={organizationHref(basePath, organizationName)}>{organizationName}</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationMenu({
  active,
  basePath,
  organizationName,
  viewerCanUpdate,
}: {
  active: "pullrequests";
  basePath: string;
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className="">
            <a href={organizationHref(basePath, organizationName)}>{t("title.organizationHome")}</a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/issues`)}>
              {t("menu.issue")}
            </a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/boards`)}>
              {t("menu.board")}
            </a>
          </li>
          <li className={active === "pullrequests" ? "active" : ""}>
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/pullrequests`)}>
              {t("menu.pullRequest")}
            </a>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <a
                  href={prefixBasePath(basePath, `/organizations/${organizationName}/settingform`)}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function organizationHref(basePath: string, organizationName: string) {
  return prefixBasePath(basePath, `/organizations/${organizationName}`);
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function booleanField(value: unknown) {
  return value === true;
}

function percentOf(count: number, total: number) {
  return total <= 0 ? 0 : Math.round((count / total) * 100);
}
