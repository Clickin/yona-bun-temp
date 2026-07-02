import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";
import {
  siteIssuesQueryOptions,
  siteUpdateQueryOptions,
  type SiteIssue,
  type SiteIssueState,
} from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type IssueListSearch = {
  pageNum: number;
  state: SiteIssueState;
};

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    activeProps?: { className?: string | undefined };
    children?: ReactNode;
    search?: Record<string, number | string | undefined>;
    to: string;
  }
>;

export const Route = createFileRoute("/sites/issueList")({
  component: SiteIssueListRoute,
  validateSearch: (search: Record<string, unknown>): IssueListSearch => ({
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : 1,
    state: search.state === "closed" ? "closed" : "open",
  }),
});

function SiteIssueListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteIssueListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteIssueListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { pageNum, state } = Route.useSearch();
  const query = useQuery(siteIssuesQueryOptions(runtimeConfig, { page: pageNum, state }));
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.issueList" />
                </h2>
              </div>
              <ul className="nav nav-tabs">
                <IssueStateTab state="open" selected={state} />
                <IssueStateTab state="closed" selected={state} />
              </ul>
              <ul className="post-list-wrap">
                {(query.data?.issues ?? []).map((issue) => (
                  <IssueListItem
                    issue={issue}
                    key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
                    runtimeConfig={runtimeConfig}
                  />
                ))}
              </ul>

              <IssueListPagination
                currentPage={query.data?.page ?? pageNum}
                state={state}
                totalPages={query.data?.totalPages ?? 0}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function IssueListPagination({
  currentPage,
  state,
  totalPages,
}: {
  currentPage: number;
  state: SiteIssueState;
  totalPages: number;
}) {
  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              search={{ pageNum: currentPage - 1, state }}
              to="/sites/issueList"
              {...{ "pjax-page": "" }}
            >
              <i className="ico btn-pg-prev"></i>
              <span>PREV</span>
            </LegacyInternalLink>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">PREV</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            readOnly
            type="number"
            value={currentPage}
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              search={{ pageNum: currentPage + 1, state }}
              to="/sites/issueList"
              {...{ "pjax-page": "" }}
            >
              <span>NEXT</span>
              <i className="ico btn-pg-next"></i>
            </LegacyInternalLink>
          ) : (
            <>
              <span className="off">NEXT</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList", active: true },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update", badge: showUpdateBadge },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <LegacyInternalLink activeProps={{ className: undefined }} to={item.href}>
            <LegacyMessage messageKey={item.labelKey} />
            {item.badge ? <span className="notification-badge">1</span> : null}
          </LegacyInternalLink>
        </li>
      ))}
    </ul>
  );
}

function IssueStateTab({ selected, state }: { selected: SiteIssueState; state: SiteIssueState }) {
  const { t } = useLegacyMessages();

  return (
    <li className={selected === state ? "active" : ""}>
      <LegacyInternalLink
        activeProps={{ className: undefined }}
        search={{ state }}
        to="/sites/issueList"
      >
        {t(`issue.state.${state}`)}
      </LegacyInternalLink>
    </li>
  );
}

function IssueListItem({
  issue,
  runtimeConfig,
}: {
  issue: SiteIssue;
  runtimeConfig: RuntimeConfig;
}) {
  const projectPath = prefixBasePath(
    runtimeConfig.basePath,
    `/${issue.ownerName}/${issue.projectName}`,
  );
  const issuePath = prefixBasePath(
    runtimeConfig.basePath,
    `/${issue.ownerName}/${issue.projectName}/issue/${issue.issueNumber}`,
  );
  const authorPath = prefixBasePath(runtimeConfig.basePath, `/${issue.authorLoginId}`);

  return (
    <li className="row-fluid listitem">
      <a href={projectPath} className="avatar-wrap list-avatar">
        <img src={issue.projectLogoUrl} alt={issue.projectName} />
      </a>
      <div className="post-info-wrap">
        <a href={projectPath} className="post-project">
          {issue.ownerName}/{issue.projectName}
        </a>
        <span className="post-info-separator">·</span>
        <a href={issuePath} className="post-title">
          {issue.title}
        </a>
      </div>
      <div className="post-meta-wrap">
        <a href={authorPath} className="avatar-wrap">
          {isDefaultAuthorAvatar(issue.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img src={issue.authorAvatarUrl} />
          ) : (
            <img src={issue.authorAvatarUrl} alt={issue.authorLabel} width="16" height="16" />
          )}
        </a>
        <a href={authorPath} className="post-meta-item">
          {issue.authorLabel}
        </a>
        <span className="post-meta-item" title={issue.createdTitle}>
          {issue.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={`${issuePath}#comments`}>
            <i className="yobicon-comments"></i>
            {issue.commentCount}
          </a>
        </span>
      </div>
    </li>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}

function isDefaultAuthorAvatar(avatarUrl: string) {
  return avatarUrl.includes("gravatar.com/avatar/");
}
