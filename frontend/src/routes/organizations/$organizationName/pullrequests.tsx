import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { HTMLAttributes, MouseEvent as ReactMouseEvent } from "react";
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

declare module "react" {
  interface HTMLAttributes<T> {
    "pjax-container"?: string;
  }

  interface LiHTMLAttributes<T> {
    href?: string;
  }
}

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
  const router = useRouter();
  const organizationName = stringField(organization.organizationName, "");
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const pjaxContainer = { "pjax-container": "" } satisfies HTMLAttributes<HTMLDivElement>;
  const openAction = prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}/pullrequests`,
  );
  const closedAction = prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}/closedPullrequests`,
  );
  const searchAction = selectedCategory === "closed" ? closedAction : openAction;
  const navigateTab = (event: ReactMouseEvent<HTMLButtonElement>, to: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    router.history.push(to);
  };

  return (
    <>
      <OrganizationHeader logoUrl={logoUrl} organizationName={organizationName} />
      <OrganizationMenu
        active="pullrequests"
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
                  <button
                    type="button"
                    data-url={openAction}
                    data-type="state"
                    onClick={(event) => navigateTab(event, openAction)}
                  >
                    {t("pullRequest.state.open")}
                    <span className="num-badge">{pullRequests.openCount}</span>
                  </button>
                </li>
                <li className={selectedCategory === "closed" ? "active" : ""}>
                  <button
                    type="button"
                    data-url={closedAction}
                    data-type="state"
                    onClick={(event) => navigateTab(event, closedAction)}
                  >
                    {t("pullRequest.state.closed")}
                    <span className="num-badge">{pullRequests.closedCount}</span>
                  </button>
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
  const projectParams = {
    ownerName: pullRequest.ownerName,
    projectName: pullRequest.projectName,
  };
  const pullRequestParams = {
    ...projectParams,
    pullRequestNumber: String(pullRequest.pullRequestNumber),
  };
  const percent = percentOf(pullRequest.closedCommentThreadCount, pullRequest.commentThreadCount);
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const legacyHref = prefixBasePath(
    basePath,
    `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.pullRequestNumber}`,
  );

  return (
    <li className="post-item title" href={legacyHref}>
      <div className="span10 span-hard-wrap">
        <Link
          params={{ user: pullRequest.contributorLoginId }}
          to="/$user"
          className="avatar-wrap mlarge"
          data-toggle="tooltip"
          data-placement="top"
          title={pullRequest.contributorLoginId}
        >
          <img src="/assets/images/default-avatar-32.png" alt="" />
        </Link>
        <div className="title-wrap">
          <span className="post-id">{pullRequest.pullRequestNumber}</span>
          <Link
            params={pullRequestParams}
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
            className={`title ${pullRequest.conflict ? "conflict" : ""}`}
          >
            {pullRequest.title}
          </Link>
        </div>
        <div className="infos">
          {pullRequest.contributorLabel ? (
            <Link
              params={{ user: pullRequest.contributorLoginId }}
              to="/$user"
              className="infos-item infos-link-item"
              data-toggle="tooltip"
              data-placement="top"
              title={pullRequest.contributorLoginId}
            >
              {pullRequest.contributorLabel}
            </Link>
          ) : (
            <span className="infos-item">{t("issue.noAuthor")}</span>
          )}
          <span className="infos-item" title={pullRequest.createdLabel}>
            {pullRequest.createdLabel}
          </span>
          <Link
            params={projectParams}
            to="/$ownerName/$projectName"
            className="infos-link-item group-project-name"
          >
            {pullRequest.projectName}
          </Link>
          {pullRequest.commentThreadCount > 0 ? (
            <div className="infos-item" style={{ marginRight: 20 }}>
              <i className="infos-icon yobicon-post2 vmiddle"></i>
              <div className="upload-progress">
                <div className="bar orange" style={{ width: `${percent}%` }}></div>
              </div>
              <Link
                params={pullRequestParams}
                to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"
                data-toggle="tooltip"
                title={`${t("pullRequest.review.closed")} / ${t("pullRequest.review.total")}`}
              >
                <span>{pullRequest.closedCommentThreadCount}</span>
                <span className="gray-txt">/</span>
                <span className="size total">{pullRequest.commentThreadCount}</span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
      <div className="span2 hide-in-mobile">
        <div className="mt5 pull-right hide-in-mobile">
          {pullRequest.receiverLoginId ? (
            <Link
              params={{ user: pullRequest.receiverLoginId }}
              to="/$user"
              className="avatar-wrap assinee"
              data-toggle="tooltip"
              data-placement="top"
              title=""
              data-original-title={pullRequest.receiverLabel}
            >
              <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
            </Link>
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
  logoUrl,
  organizationName,
}: {
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
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  search={{}}
                  to={`/organizations/${organizationName}`}
                >
                  {organizationName}
                </Link>
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
  organizationName,
  viewerCanUpdate,
}: {
  active: "pullrequests";
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className="">
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={{}}
              to={`/organizations/${organizationName}`}
            >
              {t("title.organizationHome")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={() => undefined}
              to={`/organizations/${organizationName}/issues`}
            >
              {t("menu.issue")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={() => undefined}
              to={`/organizations/${organizationName}/boards`}
            >
              {t("menu.board")}
            </Link>
          </li>
          <li className={active === "pullrequests" ? "active" : ""}>
            <Link
              activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
              search={() => undefined}
              to={`/organizations/${organizationName}/pullrequests`}
            >
              {t("menu.pullRequest")}
            </Link>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  search={() => undefined}
                  to={`/organizations/${organizationName}/settingform`}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
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
