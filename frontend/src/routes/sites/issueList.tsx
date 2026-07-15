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
import { globalBreakpoints, globalColors } from "../../theme.stylex";
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
  issueListStateTabs: {
    marginBottom: globalColors.siteIssueListStateTabsMarginBottom,
    marginLeft: globalColors.siteIssueListStateTabsMarginLeft,
    listStyle: globalColors.siteIssueListStateTabsListStyle,
    borderBottomWidth: globalColors.siteIssueListStateTabsBorderBottomWidth,
    borderBottomStyle: globalColors.siteIssueListStateTabsBorderBottomStyle,
    borderBottomColor: globalColors.siteIssueListStateTabsBorderBottom,
    "::before": {
      content: globalColors.siteIssueListStateTabsClearfixContent,
      display: globalColors.siteIssueListStateTabsClearfixDisplay,
      lineHeight: globalColors.siteIssueListStateTabsClearfixLineHeight,
    },
    "::after": {
      content: globalColors.siteIssueListStateTabsClearfixContent,
      display: globalColors.siteIssueListStateTabsClearfixDisplay,
      lineHeight: globalColors.siteIssueListStateTabsClearfixLineHeight,
      clear: globalColors.siteIssueListStateTabsClearfixClear,
    },
  },
  issueListStateTabItem: {
    float: globalColors.siteIssueListStateTabItemFloat,
    marginBottom: globalColors.siteIssueListStateTabItemMarginBottom,
  },
  issueListStateTabItemSelected: {
    marginBottom: globalColors.siteIssueListStateTabItemMarginBottom,
  },
  issueListStateTabLink: {
    display: globalColors.siteIssueListStateTabLinkDisplay,
    paddingInline: {
      default: globalColors.siteIssueListStateTabLinkDesktopPaddingInline,
      [globalBreakpoints.mobile]: globalColors.siteIssueListStateTabLinkMobilePaddingInline,
    },
    paddingBlock: globalColors.siteIssueListStateTabLinkPaddingBlock,
    marginRight: globalColors.siteIssueListStateTabLinkMarginRight,
    lineHeight: globalColors.siteIssueListStateTabLinkLineHeight,
    borderWidth: globalColors.siteIssueListStateTabLinkBorderWidth,
    borderStyle: globalColors.siteIssueListStateTabLinkBorderStyle,
    borderColor: {
      default: globalColors.siteIssueListStateTabLinkBorder,
      ":hover": globalColors.siteIssueListStateTabLinkInteractiveBorder,
      ":focus": globalColors.siteIssueListStateTabLinkInteractiveBorder,
    },
    borderRadius: globalColors.siteIssueListStateTabLinkRadius,
    color: globalColors.siteIssueListStateTabLinkText,
    fontWeight: globalColors.siteIssueListStateTabLinkFontWeight,
    backgroundColor: {
      ":hover": globalColors.siteIssueListStateTabLinkInteractiveSurface,
      ":focus": globalColors.siteIssueListStateTabLinkInteractiveSurface,
    },
    textDecoration: {
      ":hover": globalColors.siteIssueListStateTabLinkInteractiveTextDecoration,
      ":focus": globalColors.siteIssueListStateTabLinkInteractiveTextDecoration,
    },
  },
  issueListStateTabLinkSelected: {
    color: {
      default: globalColors.siteIssueListStateTabLinkSelectedText,
      ":hover": globalColors.siteIssueListStateTabLinkSelectedText,
      ":focus": globalColors.siteIssueListStateTabLinkSelectedText,
    },
    cursor: globalColors.siteIssueListStateTabLinkSelectedCursor,
    backgroundColor: {
      default: globalColors.siteIssueListStateTabLinkSelectedSurface,
      ":hover": globalColors.siteIssueListStateTabLinkSelectedSurface,
      ":focus": globalColors.siteIssueListStateTabLinkSelectedSurface,
    },
    borderColor: {
      default: globalColors.siteIssueListStateTabLinkSelectedBorder,
      ":hover": globalColors.siteIssueListStateTabLinkSelectedBorder,
      ":focus": globalColors.siteIssueListStateTabLinkSelectedBorder,
    },
    borderBottomColor: {
      default: globalColors.siteIssueListStateTabLinkSelectedBorderBottom,
      ":hover": globalColors.siteIssueListStateTabLinkSelectedBorderBottom,
      ":focus": globalColors.siteIssueListStateTabLinkSelectedBorderBottom,
    },
    fontWeight: globalColors.siteIssueListStateTabLinkFontWeight,
  },
  issueListContainer: {
    listStyle: globalColors.siteIssueListContainerListStyle,
  },
  issueListRow: {
    paddingBlock: globalColors.siteIssueListRowPaddingBlock,
    paddingInline: globalColors.siteIssueListRowPaddingInline,
    borderBottomColor: globalColors.siteIssueListRowBorder,
    borderBottomStyle: globalColors.siteIssueListRowBorderStyle,
    borderBottomWidth: globalColors.siteIssueListRowBorderWidth,
    lineHeight: globalColors.siteIssueListRowLineHeight,
  },
  issueListRowEven: {
    backgroundColor: globalColors.siteIssueListRowEvenSurface,
  },
  issueListProjectAvatar: {
    width: globalColors.siteIssueListAvatarWidth,
    height: globalColors.siteIssueListAvatarHeight,
    marginRight: globalColors.siteIssueListAvatarMarginRight,
    marginTop: globalColors.siteIssueListAvatarMarginTop,
    float: globalColors.siteIssueListAvatarFloat,
    display: globalColors.siteIssueListAvatarDisplay,
    verticalAlign: globalColors.siteIssueListAvatarVerticalAlign,
    overflow: globalColors.siteIssueListAvatarOverflow,
    backgroundColor: globalColors.siteIssueListAvatarSurface,
    borderRadius: globalColors.siteIssueListAvatarRadius,
  },
  issueListProjectAvatarImage: {
    width: globalColors.siteIssueListAvatarImageWidth,
    verticalAlign: globalColors.siteIssueListAvatarImageVerticalAlign,
  },
  issueInfo: {
    lineHeight: globalColors.siteIssueListInfoLineHeight,
    marginTop: globalColors.siteIssueListInfoMarginTop,
  },
  issueProjectLink: {
    fontSize: globalColors.siteIssueListProjectFontSize,
    fontWeight: globalColors.siteIssueListProjectFontWeight,
    display: globalColors.siteIssueListProjectDisplay,
    lineHeight: globalColors.siteIssueListProjectLineHeight,
    color: globalColors.siteIssueListProjectText,
  },
  issueInfoSeparator: {
    fontSize: globalColors.siteIssueListSeparatorFontSize,
    fontWeight: globalColors.siteIssueListSeparatorFontWeight,
    paddingInline: globalColors.siteIssueListSeparatorPaddingInline,
  },
  issueTitleLink: {
    fontSize: globalColors.siteIssueListTitleFontSize,
    fontWeight: globalColors.siteIssueListTitleFontWeight,
  },
  issueListMetadata: {
    fontSize: globalColors.siteIssueListMetadataFontSize,
    lineHeight: globalColors.siteIssueListMetadataLineHeight,
  },
  issueListAuthorAvatar: {
    width: globalColors.siteIssueListMetadataAvatarWidth,
    height: globalColors.siteIssueListMetadataAvatarHeight,
    display: globalColors.siteIssueListMetadataAvatarDisplay,
    verticalAlign: globalColors.siteIssueListMetadataAvatarVerticalAlign,
    overflow: globalColors.siteIssueListMetadataAvatarOverflow,
    backgroundColor: globalColors.siteIssueListMetadataAvatarSurface,
    borderRadius: globalColors.siteIssueListMetadataAvatarRadius,
  },
  issueListAuthorAvatarImage: {
    width: globalColors.siteIssueListMetadataAvatarImageWidth,
    verticalAlign: globalColors.siteIssueListMetadataAvatarImageVerticalAlign,
  },
  issueListMetadataItem: {
    marginBlock: globalColors.siteIssueListMetadataItemMarginBlock,
    marginInline: globalColors.siteIssueListMetadataItemMarginInline,
  },
  issueListCommentsIcon: {
    verticalAlign: globalColors.siteIssueListCommentsIconVerticalAlign,
  },
  issueListPaginationWrapper: {
    width: globalColors.siteIssueListPaginationWrapperWidth,
    textAlign: globalColors.siteIssueListPaginationWrapperTextAlign,
    margin: globalColors.siteIssueListPaginationWrapperMargin,
    clear: globalColors.siteIssueListPaginationWrapperClear,
  },
  issueListPaginationList: {
    margin: globalColors.siteIssueListPaginationListMargin,
    marginLeft: {
      default: globalColors.siteIssueListPaginationListDesktopMarginLeft,
      [globalBreakpoints.mobile]: globalColors.siteIssueListPaginationListMobileMarginLeft,
    },
    padding: globalColors.siteIssueListPaginationListPadding,
    listStyle: globalColors.siteIssueListPaginationListStyle,
    fontSize: globalColors.siteIssueListPaginationListFontSize,
    display: globalColors.siteIssueListPaginationListDisplay,
  },
  issueListPaginationItem: {
    display: globalColors.siteIssueListPaginationItemDisplay,
    padding: globalColors.siteIssueListPaginationItemPadding,
    fontSize: globalColors.siteIssueListPaginationItemFontSize,
    color: globalColors.siteIssueListPaginationItemText,
  },
  issueListPaginationIconItem: {
    padding: globalColors.siteIssueListPaginationIconItemPadding,
  },
  issueListPaginationDelimiter: {
    color: globalColors.siteIssueListPaginationDelimiterText,
    padding: globalColors.siteIssueListPaginationDelimiterPadding,
  },
  issueListPaginationInput: {
    margin: globalColors.siteIssueListPaginationInputMargin,
    width: globalColors.siteIssueListPaginationInputWidth,
    textAlign: globalColors.siteIssueListPaginationInputTextAlign,
    fontWeight: globalColors.siteIssueListPaginationInputFontWeight,
    borderWidth: globalColors.siteIssueListPaginationInputBorderWidth,
    borderStyle: globalColors.siteIssueListPaginationInputBorderStyle,
    borderColor: {
      default: globalColors.siteIssueListPaginationInputBorder,
      ":hover": globalColors.siteIssueListPaginationInputInteractiveBorder,
      ":focus": globalColors.siteIssueListPaginationInputInteractiveBorder,
    },
    color: {
      ":hover": globalColors.siteIssueListPaginationInputInteractiveText,
      ":focus": globalColors.siteIssueListPaginationInputInteractiveText,
    },
    boxShadow: {
      ":hover": globalColors.siteIssueListPaginationInputInteractiveShadow,
      ":focus": globalColors.siteIssueListPaginationInputInteractiveShadow,
    },
  },
  issueListPaginationLabel: {
    fontSize: globalColors.siteIssueListPaginationLabelFontSize,
    color: globalColors.siteIssueListPaginationLabelText,
  },
  issueListPaginationOffLabel: {
    color: globalColors.siteIssueListPaginationOffLabelText,
  },
  issueListPaginationIcon: {
    display: globalColors.siteIssueListPaginationIconDisplay,
    verticalAlign: globalColors.siteIssueListPaginationIconVerticalAlign,
    width: globalColors.siteIssueListPaginationIconWidth,
    height: globalColors.siteIssueListPaginationIconHeight,
  },
  issueListPaginationPrevIcon: {
    marginRight: globalColors.siteIssueListPaginationPrevIconMarginRight,
  },
  issueListPaginationNextIcon: {
    marginLeft: globalColors.siteIssueListPaginationNextIconMarginLeft,
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
              <ul {...issueListStateTabsStyleProps} data-stylex-owner="site-issue-list-state-tabs">
                <IssueStateTab state="open" selected={state} />
                <IssueStateTab state="closed" selected={state} />
              </ul>
              <ul
                {...issueListContainerStyleProps}
                className={`post-list-wrap ${issueListContainerStyleProps.className ?? ""}`}
                data-stylex-owner="site-issue-list-container"
              >
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
