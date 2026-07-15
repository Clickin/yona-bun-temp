import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { type KeyboardEvent } from "react";
import {
  siteIssuesQueryOptions,
  siteUpdateQueryOptions,
  type SiteIssue,
  type SiteIssueState,
} from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { type RuntimeConfig } from "../../runtime-config";
import { globalColors } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";

type IssueListSearch = {
  pageNum: number;
  state: string;
} & Record<string, unknown>;

type IssueListRouteSearch = {
  pageNum?: number;
  state?: string;
} & Record<string, unknown>;

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined },
};

const legacyIssueListLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined },
};
const legacySiteIssueListSidebarSearch = {
  __legacySiteIssueListSidebarActiveMarker: "inactive",
};
const styles = stylex.create({
  titleArea: {
    overflow: globalColors.siteDiagnosticNoErrorTitleOverflow,
    marginBottom: globalColors.siteDiagnosticNoErrorTitleMarginBottom,
    paddingBottom: globalColors.siteDiagnosticNoErrorTitlePaddingBottom,
    borderBottomStyle: globalColors.siteDiagnosticNoErrorTitleBorderStyle,
    borderBottomWidth: globalColors.siteDiagnosticNoErrorTitleBorderBottomWidth,
    borderBottomColor: globalColors.siteDiagnosticNoErrorTitleBorder,
  },
  title: {
    margin: globalColors.siteDiagnosticNoErrorHeadingMargin,
    fontSize: globalColors.siteDiagnosticNoErrorHeadingFontSize,
    color: globalColors.siteDiagnosticNoErrorHeadingText,
    lineHeight: globalColors.siteDiagnosticNoErrorHeadingLineHeight,
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);

export const Route = createFileRoute("/sites/issueList")({
  component: SiteIssueListRoute,
  validateSearch: (search: Record<string, unknown>): IssueListRouteSearch => ({
    ...search,
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : undefined,
    state: normalizeLegacyIssueStateSearch(search.state),
  }),
});

function SiteIssueListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteIssueListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteIssueListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const routeSearch = Route.useSearch();
  const search = normalizeIssueListSearch(routeSearch);
  const { pageNum, state } = search;
  const { t } = useLegacyMessages();
  const query = useQuery(
    siteIssuesQueryOptions(runtimeConfig, { page: pageNum, state: state as SiteIssueState }),
  );
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <title>{t("title.siteSetting")}</title>
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
              <div
                {...titleAreaStyleProps}
                className={`title_area ${titleAreaStyleProps.className ?? ""}`}
                data-stylex-owner="site-issue-list-title-strip"
              >
                <h2 {...titleStyleProps} className={`pull-left ${titleStyleProps.className ?? ""}`}>
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

function normalizeIssueListSearch(search: IssueListRouteSearch): IssueListSearch {
  return {
    ...search,
    pageNum: search.pageNum ?? 1,
    state: search.state ?? "open",
  };
}

function normalizeLegacyIssueStateSearch(state: unknown): string | undefined {
  if (typeof state !== "string" || state.trim() === "") {
    return undefined;
  }
  return state;
}

function IssueListPagination({
  currentPage,
  search,
  state,
  totalPages,
}: {
  currentPage: number;
  search: IssueListSearch;
  state: string;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const navigate = useNavigate();

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (targetPageNum: number): IssueListSearch => ({
    ...search,
    pageNum: targetPageNum,
    state,
  });
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
              {...legacyIssueListLinkProps}
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
              {...legacyIssueListLinkProps}
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
        <Link {...legacySiteSidebarLinkProps} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="active">
        <Link
          {...legacySiteSidebarLinkProps}
          activeProps={{}}
          mask={{ to: "/sites/issueList" }}
          search={legacySiteIssueListSidebarSearch}
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/diagnostic">
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function IssueStateTab({ selected, state }: { selected: string; state: SiteIssueState }) {
  const { t } = useLegacyMessages();

  return (
    <li className={selected === state ? "active" : ""}>
      <Link {...legacyIssueListLinkProps} search={{ state }} to="/sites/issueList">
        {t(`issue.state.${state}`)}
      </Link>
    </li>
  );
}

function IssueListItem({ issue }: { issue: SiteIssue }) {
  const projectLogoUrl = issue.projectLogoUrl.trim() || "/assets/images/project_default_logo.png";

  return (
    <li className="row-fluid listitem">
      <Link
        to="/$ownerName/$projectName"
        params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
        className="avatar-wrap list-avatar"
      >
        <img src={projectLogoUrl} alt={issue.projectName} />
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
        <Link
          to="/$user"
          params={{ user: issue.authorLoginId }}
          search={legacyPublicProfileSearch}
          mask={legacyPublicProfileMask(issue.authorLoginId)}
          className="avatar-wrap"
        >
          {isDefaultAuthorAvatar(issue.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img src={issue.authorAvatarUrl} />
          ) : (
            <img src={issue.authorAvatarUrl} alt={authorAvatarAlt(issue)} width="16" height="16" />
          )}
        </Link>
        <Link
          to="/$user"
          params={{ user: issue.authorLoginId }}
          search={legacyPublicProfileSearch}
          mask={legacyPublicProfileMask(issue.authorLoginId)}
          className="post-meta-item"
        >
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

const legacyPublicProfileSearch = {
  daysAgo: 14,
  selected: "issues" as const,
};

function legacyPublicProfileMask(loginId: string) {
  return { to: `/${loginId}` as "/" };
}
