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
import { globalBreakpoints } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteIssueListColors } from "./-issueList.stylex";

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
  settingWrap: {
    margin: "0px auto",
  },
  settingGrid: {
    width: "100%",
    "::before": {
      content: '""',
      display: "table",
      lineHeight: "0px",
    },
    "::after": {
      clear: "both",
      content: '""',
      display: "table",
      lineHeight: "0px",
    },
  },
  settingColumn: {
    boxSizing: "border-box",
    display: "block",
    float: {
      default: "left",
      "@media (max-width: 767px)": "none",
    },
    minHeight: "30px",
  },
  settingSidebarColumn: {
    marginLeft: "0px",
    width: {
      default: "14.893617021276595%",
      "@media (max-width: 767px)": "100%",
    },
  },
  settingContentColumn: {
    marginLeft: {
      default: "2.127659574468085%",
      "@media (max-width: 767px)": "0px",
    },
    width: {
      default: "82.97872340425532%",
      "@media (max-width: 767px)": "100%",
    },
  },
  sidebar: {
    margin: "0px",
    padding: "0px",
    listStyle: "none",
  },
  sidebarItem: {
    borderLeftColor: siteIssueListColors.neutralBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarFirstItem: { marginTop: "0px" },
  sidebarActiveItem: {
    borderLeftColor: siteIssueListColors.accent,
    fontWeight: "bold",
  },
  sidebarLink: {
    backgroundColor: {
      ":hover": siteIssueListColors.neutralBorder,
      ":focus": siteIssueListColors.neutralBorder,
    },
    color: "inherit",
    display: "block",
    outline: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
    },
    padding: "5px 10px",
    textDecoration: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
    },
  },
  sidebarActiveLink: {
    backgroundColor: {
      ":hover": "transparent",
      ":focus": "transparent",
    },
  },
  sidebarBadge: {
    backgroundColor: siteIssueListColors.badgeSurface,
    borderColor: siteIssueListColors.whiteSurface,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: siteIssueListColors.badgeShadow,
    color: siteIssueListColors.badgeText,
    fontSize: "12px",
    lineHeight: "20px",
    padding: "0px 5px",
  },
  titleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteIssueListColors.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: siteIssueListColors.titleText,
    lineHeight: "30px",
    float: "left",
  },
  issueListStateTabs: {
    marginBottom: "20px",
    marginLeft: "0px",
    listStyle: "none",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: siteIssueListColors.titleBorder,
    "::before": {
      content: '""',
      display: "table",
      lineHeight: "0px",
    },
    "::after": {
      content: '""',
      display: "table",
      lineHeight: "0px",
      clear: "both",
    },
  },
  issueListStateTabItem: {
    float: "left",
    marginBottom: "-1px",
  },
  issueListStateTabItemSelected: {
    marginBottom: "-1px",
  },
  issueListStateTabLink: {
    display: "block",
    paddingInline: {
      default: "30px",
      [globalBreakpoints.mobile]: "5px",
    },
    paddingBlock: "8px",
    marginRight: "2px",
    lineHeight: "20px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: "transparent",
      ":hover": siteIssueListColors.neutralBorder,
      ":focus": siteIssueListColors.neutralBorder,
    },
    borderRadius: "4px 4px 0px 0px",
    color: siteIssueListColors.linkInteractiveText,
    fontWeight: "bold",
    backgroundColor: {
      ":hover": siteIssueListColors.interactiveSurface,
      ":focus": siteIssueListColors.interactiveSurface,
    },
    textDecoration: {
      ":hover": "none",
      ":focus": "none",
    },
  },
  issueListStateTabLinkSelected: {
    color: {
      default: siteIssueListColors.selectedText,
      ":hover": siteIssueListColors.selectedText,
      ":focus": siteIssueListColors.selectedText,
    },
    cursor: "default",
    backgroundColor: {
      default: siteIssueListColors.whiteSurface,
      ":hover": siteIssueListColors.whiteSurface,
      ":focus": siteIssueListColors.whiteSurface,
    },
    borderColor: {
      default: siteIssueListColors.titleBorder,
      ":hover": siteIssueListColors.titleBorder,
      ":focus": siteIssueListColors.titleBorder,
    },
    borderBottomColor: {
      default: "transparent",
      ":hover": "transparent",
      ":focus": "transparent",
    },
    fontWeight: "bold",
  },
  issueListContainer: {
    listStyle: "none",
    marginLeft: {
      default: "0px",
      [globalBreakpoints.mobile]: "10px",
    },
  },
  issueListRow: {
    paddingBlock: "10px",
    paddingInline: "0px",
    borderBottomColor: siteIssueListColors.rowBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    lineHeight: "70px",
  },
  issueListRowEven: {
    backgroundColor: siteIssueListColors.evenRowSurface,
  },
  issueListProjectAvatar: {
    width: "45px",
    height: "45px",
    marginRight: "10px",
    marginTop: "3px",
    float: "left",
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    backgroundColor: siteIssueListColors.titleBorder,
    borderRadius: "3px",
  },
  issueListProjectAvatarImage: {
    width: "100%",
    verticalAlign: "top",
  },
  issueInfo: {
    lineHeight: "20px",
    marginTop: "5px",
  },
  issueProjectLink: {
    fontSize: "15px",
    fontWeight: "bold",
    display: "inline-block",
    lineHeight: "20px",
    color: siteIssueListColors.linkText,
  },
  issueInfoSeparator: {
    fontSize: "15px",
    fontWeight: "bold",
    paddingInline: "5px",
  },
  issueTitleLink: {
    fontSize: "15px",
    fontWeight: "bold",
  },
  issueListMetadata: {
    fontSize: "11px",
    lineHeight: "20px",
  },
  issueListAuthorAvatar: {
    width: "14px",
    height: "14px",
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    backgroundColor: siteIssueListColors.titleBorder,
    borderRadius: "3px",
  },
  issueListAuthorAvatarImage: {
    width: "100%",
    verticalAlign: "top",
  },
  issueListMetadataItem: {
    marginBlock: "0px",
    marginInline: "5px",
  },
  issueListCommentsIcon: {
    verticalAlign: "middle",
  },
  issueListPaginationWrapper: {
    width: "100%",
    textAlign: "center",
    margin: "20px 0px",
    clear: "both",
  },
  issueListPaginationList: {
    margin: "0px",
    marginLeft: {
      default: "-120px",
      [globalBreakpoints.mobile]: "0px",
    },
    padding: "0px",
    listStyle: "none",
    fontSize: "0px",
    display: "inline-block",
  },
  issueListPaginationItem: {
    display: "inline-block",
    padding: "0px 10px",
    fontSize: "12px",
    color: siteIssueListColors.mutedText,
  },
  issueListPaginationIconItem: {
    padding: "0px 5px",
  },
  issueListPaginationDelimiter: {
    color: siteIssueListColors.titleBorder,
    padding: "0px 5px",
  },
  issueListPaginationInput: {
    margin: "0px",
    width: "30px",
    textAlign: "center",
    fontWeight: "bold",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: siteIssueListColors.neutralBorder,
      ":hover": siteIssueListColors.accent,
      ":focus": siteIssueListColors.accent,
    },
    color: {
      ":hover": siteIssueListColors.accent,
      ":focus": siteIssueListColors.accent,
    },
    boxShadow: {
      ":hover": siteIssueListColors.inputShadow,
      ":focus": siteIssueListColors.inputShadow,
    },
  },
  issueListPaginationLabel: {
    fontSize: "11px",
    color: siteIssueListColors.accent,
  },
  issueListPaginationOffLabel: {
    color: siteIssueListColors.mutedText,
  },
  issueListPaginationIcon: {
    display: "inline-block",
    verticalAlign: "middle",
    width: "6px",
    height: "9px",
  },
  issueListPaginationPrevIcon: {
    marginRight: "10px",
  },
  issueListPaginationNextIcon: {
    marginLeft: "10px",
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const issueListStateTabsStyleProps = stylex.props(styles.issueListStateTabs);
const issueListContainerStyleProps = stylex.props(styles.issueListContainer);
const issueListRowStyleProps = stylex.props(styles.issueListRow);
const issueListRowEvenStyleProps = stylex.props(styles.issueListRow, styles.issueListRowEven);
const issueListProjectAvatarStyleProps = stylex.props(styles.issueListProjectAvatar);
const issueListProjectAvatarImageStyleProps = stylex.props(styles.issueListProjectAvatarImage);
const issueInfoStyleProps = stylex.props(styles.issueInfo);
const issueProjectLinkStyleProps = stylex.props(styles.issueProjectLink);
const issueInfoSeparatorStyleProps = stylex.props(styles.issueInfoSeparator);
const issueTitleLinkStyleProps = stylex.props(styles.issueTitleLink);
const issueListMetadataStyleProps = stylex.props(styles.issueListMetadata);
const issueListAuthorAvatarStyleProps = stylex.props(styles.issueListAuthorAvatar);
const issueListAuthorAvatarImageStyleProps = stylex.props(styles.issueListAuthorAvatarImage);
const issueListMetadataItemStyleProps = stylex.props(styles.issueListMetadataItem);
const issueListCommentsIconStyleProps = stylex.props(styles.issueListCommentsIcon);
const issueListPaginationWrapperStyleProps = stylex.props(styles.issueListPaginationWrapper);
const issueListPaginationListStyleProps = stylex.props(styles.issueListPaginationList);
const issueListPaginationItemStyleProps = stylex.props(styles.issueListPaginationItem);
const issueListPaginationIconItemStyleProps = stylex.props(
  styles.issueListPaginationItem,
  styles.issueListPaginationIconItem,
);
const issueListPaginationDelimiterStyleProps = stylex.props(
  styles.issueListPaginationItem,
  styles.issueListPaginationDelimiter,
);
const issueListPaginationInputStyleProps = stylex.props(styles.issueListPaginationInput);
const issueListPaginationLabelStyleProps = stylex.props(styles.issueListPaginationLabel);
const issueListPaginationOffLabelStyleProps = stylex.props(
  styles.issueListPaginationLabel,
  styles.issueListPaginationOffLabel,
);
const issueListPaginationPrevIconStyleProps = stylex.props(
  styles.issueListPaginationIcon,
  styles.issueListPaginationPrevIcon,
);
const issueListPaginationNextIconStyleProps = stylex.props(
  styles.issueListPaginationIcon,
  styles.issueListPaginationNextIcon,
);

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
        <div {...stylex.props(styles.settingWrap)} data-stylex-owner="site-issue-list-setting-wrap">
          <div
            {...stylex.props(styles.settingGrid)}
            data-stylex-owner="site-issue-list-setting-grid"
          >
            <div
              {...stylex.props(styles.settingColumn, styles.settingSidebarColumn)}
              data-stylex-owner="site-issue-list-setting-sidebar-column"
            >
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div
              {...stylex.props(styles.settingColumn, styles.settingContentColumn)}
              data-stylex-owner="site-issue-list-setting-content-column"
            >
              <div {...titleAreaStyleProps} data-stylex-owner="site-issue-list-title-strip">
                <h2 {...titleStyleProps} data-stylex-owner="site-issue-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.issueList" />
                </h2>
              </div>
              <ul {...issueListStateTabsStyleProps} data-stylex-owner="site-issue-list-state-tabs">
                <IssueStateTab state="open" selected={state} />
                <IssueStateTab state="closed" selected={state} />
              </ul>
              <ul {...issueListContainerStyleProps} data-stylex-owner="site-issue-list-container">
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
    <div
      {...issueListPaginationWrapperStyleProps}
      id="pagination"
      className={issueListPaginationWrapperStyleProps.className}
      data-stylex-owner="site-issue-list-pagination"
    >
      <ul
        {...issueListPaginationListStyleProps}
        className={issueListPaginationListStyleProps.className}
        data-stylex-owner="site-issue-list-pagination-list"
      >
        <li
          {...issueListPaginationIconItemStyleProps}
          className={issueListPaginationIconItemStyleProps.className}
          data-pagination-variant="icon"
          data-stylex-owner="site-issue-list-pagination-item"
        >
          {hasPrev ? (
            <Link
              {...legacyIssueListLinkProps}
              search={pageSearch(currentPage - 1)}
              to="/sites/issueList"
            >
              <i
                {...issueListPaginationPrevIconStyleProps}
                className={`ico btn-pg-prev ${issueListPaginationPrevIconStyleProps.className ?? ""}`}
                data-stylex-owner="site-issue-list-pagination-icon"
              ></i>
              <span
                {...issueListPaginationLabelStyleProps}
                className={issueListPaginationLabelStyleProps.className}
                data-stylex-owner="site-issue-list-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                {...issueListPaginationPrevIconStyleProps}
                className={`ico btn-pg-prev off ${issueListPaginationPrevIconStyleProps.className ?? ""}`}
                data-pagination-state="off"
                data-stylex-owner="site-issue-list-pagination-icon"
              ></i>
              <span
                {...issueListPaginationOffLabelStyleProps}
                className={issueListPaginationOffLabelStyleProps.className}
                data-pagination-state="off"
                data-stylex-owner="site-issue-list-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li
          {...issueListPaginationItemStyleProps}
          className={issueListPaginationItemStyleProps.className}
          data-stylex-owner="site-issue-list-pagination-item"
        >
          <input
            {...issueListPaginationInputStyleProps}
            className={`nospinner ${issueListPaginationInputStyleProps.className ?? ""}`}
            data-stylex-owner="site-issue-list-pagination-input"
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
          {...issueListPaginationDelimiterStyleProps}
          className={issueListPaginationDelimiterStyleProps.className}
          data-pagination-variant="delimiter"
          data-stylex-owner="site-issue-list-pagination-item"
        >
          /
        </li>
        <li
          {...issueListPaginationItemStyleProps}
          className={issueListPaginationItemStyleProps.className}
          data-stylex-owner="site-issue-list-pagination-item"
        >
          {totalPages}
        </li>
        <li
          {...issueListPaginationIconItemStyleProps}
          className={issueListPaginationIconItemStyleProps.className}
          data-pagination-variant="icon"
          data-stylex-owner="site-issue-list-pagination-item"
        >
          {hasNext ? (
            <Link
              {...legacyIssueListLinkProps}
              search={pageSearch(currentPage + 1)}
              to="/sites/issueList"
            >
              <span
                {...issueListPaginationLabelStyleProps}
                className={issueListPaginationLabelStyleProps.className}
                data-stylex-owner="site-issue-list-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...issueListPaginationNextIconStyleProps}
                className={`ico btn-pg-next ${issueListPaginationNextIconStyleProps.className ?? ""}`}
                data-stylex-owner="site-issue-list-pagination-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span
                {...issueListPaginationOffLabelStyleProps}
                className={issueListPaginationOffLabelStyleProps.className}
                data-pagination-state="off"
                data-stylex-owner="site-issue-list-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...issueListPaginationNextIconStyleProps}
                className={`ico btn-pg-next off ${issueListPaginationNextIconStyleProps.className ?? ""}`}
                data-pagination-state="off"
                data-stylex-owner="site-issue-list-pagination-icon"
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

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul {...stylex.props(styles.sidebar)} data-stylex-owner="site-issue-list-sidebar">
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarFirstItem)}
        data-stylex-owner="site-issue-list-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          to="/sites/userList"
        >
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-issue-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarActiveItem)}
        data-stylex-owner="site-issue-list-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink, styles.sidebarActiveLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          activeProps={{}}
          mask={{ to: "/sites/issueList" }}
          search={legacySiteIssueListSidebarSearch}
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-issue-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          to="/sites/projectList"
        >
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-issue-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          to="/sites/mail"
        >
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-issue-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-issue-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          to="/sites/update"
        >
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? (
            <span
              {...stylex.props(styles.sidebarBadge)}
              data-stylex-owner="site-issue-list-sidebar-badge"
            >
              1
            </span>
          ) : null}
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-issue-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-issue-list-sidebar-link"
          to="/sites/diagnostic"
        >
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function IssueStateTab({ selected, state }: { selected: string; state: SiteIssueState }) {
  const { t } = useLegacyMessages();
  const isSelected = selected === state;
  const itemStyleProps = stylex.props(
    styles.issueListStateTabItem,
    isSelected && styles.issueListStateTabItemSelected,
  );
  const linkStyleProps = stylex.props(
    styles.issueListStateTabLink,
    isSelected && styles.issueListStateTabLinkSelected,
  );

  return (
    <li
      {...itemStyleProps}
      data-selected={String(isSelected)}
      data-stylex-owner="site-issue-list-state-tab-item"
    >
      <Link
        {...legacyIssueListLinkProps}
        {...linkStyleProps}
        data-stylex-owner="site-issue-list-state-tab-link"
        search={{ state }}
        to="/sites/issueList"
      >
        {t(`issue.state.${state}`)}
      </Link>
    </li>
  );
}

function IssueListItem({ index, issue }: { index: number; issue: SiteIssue }) {
  const projectLogoUrl = issue.projectLogoUrl.trim() || "/assets/images/project_default_logo.png";
  const rowStyleProps = index % 2 === 1 ? issueListRowEvenStyleProps : issueListRowStyleProps;

  return (
    <li
      {...rowStyleProps}
      className={`row-fluid ${rowStyleProps.className ?? ""}`}
      data-stylex-owner="site-issue-list-row"
    >
      <Link
        {...issueListProjectAvatarStyleProps}
        data-stylex-owner="site-issue-list-project-avatar"
        to="/$ownerName/$projectName"
        params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
      >
        <img
          {...issueListProjectAvatarImageStyleProps}
          data-stylex-owner="site-issue-list-project-avatar-image"
          src={projectLogoUrl}
          alt={issue.projectName}
        />
      </Link>
      <div {...issueInfoStyleProps} data-stylex-owner="site-issue-list-info">
        <Link
          {...issueProjectLinkStyleProps}
          data-stylex-owner="site-issue-list-project-link"
          to="/$ownerName/$projectName"
          params={{ ownerName: issue.ownerName, projectName: issue.projectName }}
        >
          {issue.ownerName}/{issue.projectName}
        </Link>
        <span {...issueInfoSeparatorStyleProps} data-stylex-owner="site-issue-list-separator">
          ·
        </span>
        <Link
          {...issueTitleLinkStyleProps}
          data-stylex-owner="site-issue-list-title-link"
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
      <div {...issueListMetadataStyleProps} data-stylex-owner="site-issue-list-metadata">
        <Link
          {...issueListAuthorAvatarStyleProps}
          data-stylex-owner="site-issue-list-author-avatar"
          to="/$user"
          params={{ user: issue.authorLoginId }}
          search={legacyPublicProfileSearch}
          mask={legacyPublicProfileMask(issue.authorLoginId)}
        >
          {isDefaultAuthorAvatar(issue.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img
              {...issueListAuthorAvatarImageStyleProps}
              data-stylex-owner="site-issue-list-author-avatar-image"
              src={issue.authorAvatarUrl}
            />
          ) : (
            <img
              {...issueListAuthorAvatarImageStyleProps}
              data-stylex-owner="site-issue-list-author-avatar-image"
              src={issue.authorAvatarUrl}
              alt={authorAvatarAlt(issue)}
              width="16"
              height="16"
            />
          )}
        </Link>
        <Link
          {...issueListMetadataItemStyleProps}
          data-stylex-owner="site-issue-list-metadata-item"
          to="/$user"
          params={{ user: issue.authorLoginId }}
          search={legacyPublicProfileSearch}
          mask={legacyPublicProfileMask(issue.authorLoginId)}
        >
          {issue.authorLabel}
        </Link>
        <span
          {...issueListMetadataItemStyleProps}
          data-stylex-owner="site-issue-list-metadata-item"
          title={issue.createdTitle}
        >
          {issue.createdLabel}
        </span>
        <span
          {...issueListMetadataItemStyleProps}
          data-stylex-owner="site-issue-list-metadata-item"
        >
          <Link
            to="/$ownerName/$projectName/issue/$issueNumber"
            params={{
              ownerName: issue.ownerName,
              projectName: issue.projectName,
              issueNumber: issue.issueNumber,
            }}
            hash="comments"
          >
            <i
              {...issueListCommentsIconStyleProps}
              className={`yobicon-comments ${issueListCommentsIconStyleProps.className ?? ""}`}
              data-stylex-owner="site-issue-list-comments-icon"
            ></i>
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
