import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type KeyboardEvent } from "react";
import {
  siteIssuesQueryOptions,
  siteUpdateQueryOptions,
  type SiteIssue,
  type SiteIssueState,
} from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type IssueListSearch = {
  pageNum: number;
  state: SiteIssueState;
} & Record<string, unknown>;

export const Route = createFileRoute("/sites/issueList")({
  component: SiteIssueListRoute,
  validateSearch: (search: Record<string, unknown>): IssueListSearch => ({
    ...search,
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
  const search = Route.useSearch();
  const { pageNum, state } = search;
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
                  />
                ))}
              </ul>

              <IssueListPagination
                currentPage={query.data?.page ?? pageNum}
                search={search}
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
  search,
  state,
  totalPages,
}: {
  currentPage: number;
  search: IssueListSearch;
  state: SiteIssueState;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (pageNum: number) => ({ ...search, state, pageNum });
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^[0-9]+$/.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }
    const value = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(value);
    void navigate({ search: pageSearch(value), to: "/sites/issueList" });
  };

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeProps={{ className: undefined }}
              pjax-page=""
              search={pageSearch(currentPage - 1)}
              to="/sites/issueList"
            >
              <i className="ico btn-pg-prev"></i>
              <span>{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{t("button.prevPage")}</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={currentPage}
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            type="number"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleInputKeyDown}
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              activeProps={{ className: undefined }}
              pjax-page=""
              search={pageSearch(currentPage + 1)}
              to="/sites/issueList"
            >
              <span>{t("button.nextPage")}</span>
              <i className="ico btn-pg-next"></i>
            </Link>
          ) : (
            <>
              <span className="off">{t("button.nextPage")}</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function clampPageNum(pageNum: number, totalPages: number) {
  if (!Number.isFinite(pageNum)) {
    return 1;
  }
  return Math.min(Math.max(pageNum, 1), totalPages);
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="active">
        <Link activeProps={{ className: undefined }} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/diagnostic">
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function IssueStateTab({ selected, state }: { selected: SiteIssueState; state: SiteIssueState }) {
  const { t } = useLegacyMessages();

  return (
    <li className={selected === state ? "active" : ""}>
      <Link activeProps={{ className: undefined }} search={{ state }} to="/sites/issueList">
        {t(`issue.state.${state}`)}
      </Link>
    </li>
  );
}

function IssueListItem({ issue }: { issue: SiteIssue }) {
  return (
    <li className="row-fluid listitem">
      <Link
        to="/$ownerName/$projectName"
        params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
        className="avatar-wrap list-avatar"
      >
        <img src={issue.projectLogoUrl} alt={issue.projectName} />
      </Link>
      <div className="post-info-wrap">
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
          className="post-project"
        >
          {issue.ownerName}/{issue.projectName}
        </Link>
        <span className="post-info-separator">·</span>
        <Link
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={{
            ownerName: issue.ownerName,
            projectName: issue.projectName,
            issueNumber: issue.issueNumber,
          }}
          className="post-title"
        >
          {issue.title}
        </Link>
      </div>
      <div className="post-meta-wrap">
        <Link to="/$user" params={{ user: issue.authorLoginId }} className="avatar-wrap">
          {isDefaultAuthorAvatar(issue.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img src={issue.authorAvatarUrl} />
          ) : (
            <img src={issue.authorAvatarUrl} alt={authorAvatarAlt(issue)} width="16" height="16" />
          )}
        </Link>
        <Link to="/$user" params={{ user: issue.authorLoginId }} className="post-meta-item">
          {issue.authorLabel}
        </Link>
        <span className="post-meta-item" title={issue.createdTitle}>
          {issue.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <Link
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{
              ownerName: issue.ownerName,
              projectName: issue.projectName,
              issueNumber: issue.issueNumber,
            }}
            hash="comments"
          >
            <i className="yobicon-comments"></i>
            {issue.commentCount}
          </Link>
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

function authorAvatarAlt(issue: SiteIssue) {
  return (issue as SiteIssue & { authorName?: string }).authorName || issue.authorLabel;
}
