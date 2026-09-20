import { useQuery } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, type KeyboardEvent } from "react";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import defaultProjectLogoUrl from "../../assets/legacy/project_default_logo.png";
import {
  siteIssuesQueryOptions,
  siteUpdateQueryOptions,
  type SiteIssue,
  type SiteIssueState,
} from "../../api/site-admin";
import { formatLegacyTimestamp, LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { type RuntimeConfig } from "../../runtime-config";
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
      <div data-owner="site-issue-list-breadcrumb-outer">
        <div data-owner="site-issue-list-breadcrumb-inner">
          <h3 data-owner="site-issue-list-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div data-owner="site-issue-list-page-wrap-outer">
        <div data-owner="site-issue-list-setting-wrap">
          <div data-owner="site-issue-list-setting-grid">
            <div data-owner="site-issue-list-setting-sidebar-column">
              <SiteAdminSidebar
                activeTo="/sites/issueList"
                badgeOwner="site-issue-list-sidebar-badge"
                baseLinkProps={legacySiteSidebarLinkProps}
                linkPropsByTo={{
                  "/sites/issueList": {
                    activeProps: {},
                    mask: { to: "/sites/issueList" },
                    search: legacySiteIssueListSidebarSearch,
                  },
                }}
                navOwner="site-issue-list-sidebar"
                ownerPrefix="site-issue-list-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [],
                  activeLink: [],
                  badge: [],
                  firstItem: [],
                  item: [],
                  link: [],
                  nav: [],
                }}
              />
            </div>
            <div data-owner="site-issue-list-setting-content-column">
              <div className="title_area" data-owner="site-issue-list-title-strip">
                <h2 className="pull-left" data-owner="site-issue-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.issueList" />
                </h2>
              </div>
              <ul className="nav nav-tabs" data-owner="site-issue-list-state-tabs">
                <IssueStateTab state="open" selected={state} />
                <IssueStateTab state="closed" selected={state} />
              </ul>
              <ul className="post-list-wrap" data-owner="site-issue-list-container">
                {(query.data?.issues ?? []).map((issue, index) => (
                  <IssueListItem
                    issue={issue}
                    index={index}
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
    <div className="page-navigation-wrap" id="pagination" data-owner="site-issue-list-pagination">
      <ul className="page-nums" data-owner="site-issue-list-pagination-list">
        <li
          className="page-num ikon"
          data-pagination-variant="icon"
          data-owner="site-issue-list-pagination-item"
        >
          {hasPrev ? (
            <Link
              {...legacyIssueListLinkProps}
              search={pageSearch(currentPage - 1)}
              to="/sites/issueList"
            >
              <i
                style={
                  {
                    "--site-issue-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-issue-list-pagination-first"
              ></i>
              <span data-owner="site-issue-list-pagination-label">{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i
                data-pagination-state="off"
                style={
                  {
                    "--site-issue-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-issue-list-pagination-prev"
              ></i>
              <span data-pagination-state="off" data-owner="site-issue-list-pagination-label">
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li className="page-num" data-owner="site-issue-list-pagination-item">
          <input
            data-owner="site-issue-list-pagination-input"
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
        <li
          className="page-num delimiter"
          data-pagination-variant="delimiter"
          data-owner="site-issue-list-pagination-item"
        >
          /
        </li>
        <li className="page-num" data-owner="site-issue-list-pagination-item">
          {totalPages}
        </li>
        <li
          className="page-num ikon"
          data-pagination-variant="icon"
          data-owner="site-issue-list-pagination-item"
        >
          {hasNext ? (
            <Link
              {...legacyIssueListLinkProps}
              search={pageSearch(currentPage + 1)}
              to="/sites/issueList"
            >
              <span data-owner="site-issue-list-pagination-label">{t("button.nextPage")}</span>
              <i
                style={
                  {
                    "--site-issue-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-issue-list-pagination-next"
              ></i>
            </Link>
          ) : (
            <>
              <span data-pagination-state="off" data-owner="site-issue-list-pagination-label">
                {t("button.nextPage")}
              </span>
              <i
                data-pagination-state="off"
                style={
                  {
                    "--site-issue-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-issue-list-pagination-last"
              ></i>
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

function IssueStateTab({ selected, state }: { selected: string; state: SiteIssueState }) {
  const { t } = useLegacyMessages();
  const isSelected = selected === state;

  return (
    <li data-selected={String(isSelected)} data-owner="site-issue-list-state-tab-item">
      <Link
        {...legacyIssueListLinkProps}
        data-owner="site-issue-list-state-tab-link"
        search={{ state }}
        to="/sites/issueList"
      >
        {t(`issue.state.${state}`)}
      </Link>
    </li>
  );
}

function IssueListItem({ index, issue }: { index: number; issue: SiteIssue }) {
  const { t } = useLegacyMessages();
  const projectLogoUrl = issue.projectLogoUrl.trim() || defaultProjectLogoUrl;
  const created = issue.createdTitle
    ? formatLegacyTimestamp(issue.createdTitle, t)
    : { label: issue.createdLabel, title: "" };

  return (
    <li className="row-fluid listitem" data-owner="site-issue-list-row">
      <Link
        className="avatar-wrap list-avatar"
        to="/$ownerName/$projectName"
        params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
      >
        <img
          data-owner="site-issue-list-project-avatar-image"
          src={projectLogoUrl}
          alt={issue.projectName}
        />
      </Link>
      <div className="post-info-wrap" data-owner="site-issue-list-info">
        <Link
          className="post-project"
          data-owner="site-issue-list-project-link"
          to="/$ownerName/$projectName"
          params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
        >
          {issue.ownerName}/{issue.projectName}
        </Link>{" "}
        <span className="post-info-separator" data-owner="site-issue-list-separator">·</span>{" "}
        <Link
          className="post-title"
          to="/$ownerName/$projectName/issue/$issueNumber"
          params={{
            ownerName: issue.ownerName,
            projectName: issue.projectName,
            issueNumber: issue.issueNumber,
          }}
        >
          {issue.title}
        </Link>
      </div>
      <div className="post-meta-wrap" data-owner="site-issue-list-metadata">
        <Link
          className="avatar-wrap"
          data-owner="site-issue-list-author-avatar"
          to="/$user"
          params={{ user: issue.authorLoginId }}
          search={legacyPublicProfileSearch}
          mask={legacyPublicProfileMask(issue.authorLoginId)}
        >
          {isDefaultAuthorAvatar(issue.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img data-owner="site-issue-list-author-avatar-image" src={issue.authorAvatarUrl} />
          ) : (
            <img
              data-owner="site-issue-list-author-avatar-image"
              src={issue.authorAvatarUrl}
              alt={authorAvatarAlt(issue)}
              width="16"
              height="16"
            />
          )}
        </Link>{" "}
        <Link
          className="post-meta-item"
          data-owner="site-issue-list-metadata-item"
          to="/$user"
          params={{ user: issue.authorLoginId }}
          search={legacyPublicProfileSearch}
          mask={legacyPublicProfileMask(issue.authorLoginId)}
        >
          {issue.authorLabel}{" "}
        </Link>{" "}
        <span className="post-meta-item" data-owner="site-issue-list-metadata-item" title={created.title}>
          {created.label}{" "}
        </span>{" "}
        <span className="post-comments post-meta-item" data-owner="site-issue-list-metadata-item">
          <Link
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{
              ownerName: issue.ownerName,
              projectName: issue.projectName,
              issueNumber: issue.issueNumber,
            }}
            hash="comments"
          >
            <i data-owner="site-issue-list-comments-icon" className="yobicon-comments"></i>{" "}
            {issue.commentCount}
          </Link>
        </span>
      </div>
    </li>
  );
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
