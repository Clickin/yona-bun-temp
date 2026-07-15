import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { sitePostsQueryOptions, siteUpdateQueryOptions, type SitePost } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { globalBreakpoints, globalColors } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";

type PostListRouteSearch = {
  pageNum?: number;
};

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

const legacyPaginationLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyUserLinkSearch = {
  daysAgo: undefined!,
  selected: undefined!,
} satisfies {
  daysAgo: number;
  selected: "issues" | "projects" | "pullRequests";
};
const legacyCurrentSitePostListSidebarSearch = {
  pageNum: -1,
} satisfies PostListRouteSearch;
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
  postListContainer: {
    listStyle: globalColors.sitePostListContainerListStyle,
  },
  postListRow: {
    paddingBlock: globalColors.sitePostListRowPaddingBlock,
    paddingInline: globalColors.sitePostListRowPaddingInline,
    borderBottomColor: globalColors.sitePostListRowBorder,
    borderBottomStyle: globalColors.sitePostListRowBorderStyle,
    borderBottomWidth: globalColors.sitePostListRowBorderWidth,
    lineHeight: globalColors.sitePostListRowLineHeight,
  },
  postListRowEven: {
    backgroundColor: globalColors.sitePostListRowEvenSurface,
  },
  postListProjectAvatar: {
    width: globalColors.sitePostListAvatarWidth,
    height: globalColors.sitePostListAvatarHeight,
    marginRight: globalColors.sitePostListAvatarMarginRight,
    marginTop: globalColors.sitePostListAvatarMarginTop,
    float: globalColors.sitePostListAvatarFloat,
    display: globalColors.sitePostListAvatarDisplay,
    verticalAlign: globalColors.sitePostListAvatarVerticalAlign,
    overflow: globalColors.sitePostListAvatarOverflow,
    backgroundColor: globalColors.sitePostListAvatarSurface,
    borderRadius: globalColors.sitePostListAvatarRadius,
  },
  postListProjectAvatarImage: {
    width: globalColors.sitePostListAvatarImageWidth,
    verticalAlign: globalColors.sitePostListAvatarImageVerticalAlign,
  },
  postInfo: {
    lineHeight: globalColors.sitePostListInfoLineHeight,
    marginTop: globalColors.sitePostListInfoMarginTop,
  },
  postProjectLink: {
    fontSize: globalColors.sitePostListProjectFontSize,
    fontWeight: globalColors.sitePostListProjectFontWeight,
    display: globalColors.sitePostListProjectDisplay,
    lineHeight: globalColors.sitePostListProjectLineHeight,
    color: globalColors.sitePostListProjectText,
  },
  postInfoSeparator: {
    fontSize: globalColors.sitePostListSeparatorFontSize,
    fontWeight: globalColors.sitePostListSeparatorFontWeight,
    paddingInline: globalColors.sitePostListSeparatorPaddingInline,
  },
  postTitleLink: {
    fontSize: globalColors.sitePostListTitleFontSize,
    fontWeight: globalColors.sitePostListTitleFontWeight,
  },
  postMetadata: {
    fontSize: globalColors.sitePostListMetadataFontSize,
    lineHeight: globalColors.sitePostListMetadataLineHeight,
  },
  postAuthorAvatar: {
    width: globalColors.sitePostListAuthorAvatarWidth,
    height: globalColors.sitePostListAuthorAvatarHeight,
    display: globalColors.sitePostListAuthorAvatarDisplay,
    verticalAlign: globalColors.sitePostListAuthorAvatarVerticalAlign,
    overflow: globalColors.sitePostListAuthorAvatarOverflow,
    backgroundColor: globalColors.sitePostListAuthorAvatarSurface,
    borderRadius: globalColors.sitePostListAuthorAvatarRadius,
  },
  postAuthorAvatarImage: {
    width: globalColors.sitePostListAuthorAvatarImageWidth,
    verticalAlign: globalColors.sitePostListAuthorAvatarImageVerticalAlign,
  },
  postMetadataItem: {
    marginBlock: globalColors.sitePostListMetadataItemMarginBlock,
    marginInline: globalColors.sitePostListMetadataItemMarginInline,
  },
  postCommentsIcon: {
    verticalAlign: globalColors.sitePostListCommentsIconVerticalAlign,
  },
  paginationWrapper: {
    width: globalColors.sitePostListPaginationWrapperWidth,
    textAlign: globalColors.sitePostListPaginationWrapperTextAlign,
    margin: globalColors.sitePostListPaginationWrapperMargin,
    clear: globalColors.sitePostListPaginationWrapperClear,
  },
  paginationList: {
    margin: globalColors.sitePostListPaginationListMargin,
    marginLeft: {
      default: globalColors.sitePostListPaginationListDesktopMarginLeft,
      [globalBreakpoints.mobile]: globalColors.sitePostListPaginationListMobileMarginLeft,
    },
    padding: globalColors.sitePostListPaginationListPadding,
    listStyle: globalColors.sitePostListPaginationListStyle,
    fontSize: globalColors.sitePostListPaginationListFontSize,
    display: globalColors.sitePostListPaginationListDisplay,
  },
  paginationItem: {
    display: globalColors.sitePostListPaginationItemDisplay,
    padding: globalColors.sitePostListPaginationItemPadding,
    fontSize: globalColors.sitePostListPaginationItemFontSize,
    color: globalColors.sitePostListPaginationItemText,
  },
  paginationIconItem: {
    padding: globalColors.sitePostListPaginationIconItemPadding,
  },
  paginationDelimiter: {
    color: globalColors.sitePostListPaginationDelimiterText,
    padding: globalColors.sitePostListPaginationDelimiterPadding,
  },
  paginationInput: {
    margin: globalColors.sitePostListPaginationInputMargin,
    width: globalColors.sitePostListPaginationInputWidth,
    textAlign: globalColors.sitePostListPaginationInputTextAlign,
    fontWeight: globalColors.sitePostListPaginationInputFontWeight,
    borderWidth: globalColors.sitePostListPaginationInputBorderWidth,
    borderStyle: globalColors.sitePostListPaginationInputBorderStyle,
    borderColor: {
      default: globalColors.sitePostListPaginationInputBorder,
      ":hover": globalColors.sitePostListPaginationInputInteractiveBorder,
      ":focus": globalColors.sitePostListPaginationInputInteractiveBorder,
    },
    color: {
      ":hover": globalColors.sitePostListPaginationInputInteractiveText,
      ":focus": globalColors.sitePostListPaginationInputInteractiveText,
    },
    boxShadow: {
      ":hover": globalColors.sitePostListPaginationInputInteractiveShadow,
      ":focus": globalColors.sitePostListPaginationInputInteractiveShadow,
    },
  },
  paginationLabel: {
    fontSize: globalColors.sitePostListPaginationLabelFontSize,
    color: globalColors.sitePostListPaginationLabelText,
  },
  paginationOffLabel: {
    color: globalColors.sitePostListPaginationOffLabelText,
  },
  paginationIcon: {
    display: globalColors.sitePostListPaginationIconDisplay,
    verticalAlign: globalColors.sitePostListPaginationIconVerticalAlign,
    width: globalColors.sitePostListPaginationIconWidth,
    height: globalColors.sitePostListPaginationIconHeight,
  },
  paginationPrevIcon: {
    marginRight: globalColors.sitePostListPaginationPrevIconMarginRight,
  },
  paginationNextIcon: {
    marginLeft: globalColors.sitePostListPaginationNextIconMarginLeft,
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const postListContainerStyleProps = stylex.props(styles.postListContainer);
const postListProjectAvatarStyleProps = stylex.props(styles.postListProjectAvatar);
const postListProjectAvatarImageStyleProps = stylex.props(styles.postListProjectAvatarImage);
const postInfoStyleProps = stylex.props(styles.postInfo);
const postProjectLinkStyleProps = stylex.props(styles.postProjectLink);
const postInfoSeparatorStyleProps = stylex.props(styles.postInfoSeparator);
const postTitleLinkStyleProps = stylex.props(styles.postTitleLink);
const postMetadataStyleProps = stylex.props(styles.postMetadata);
const postAuthorAvatarStyleProps = stylex.props(styles.postAuthorAvatar);
const postAuthorAvatarImageStyleProps = stylex.props(styles.postAuthorAvatarImage);
const postMetadataItemStyleProps = stylex.props(styles.postMetadataItem);
const postCommentsIconStyleProps = stylex.props(styles.postCommentsIcon);
const paginationWrapperStyleProps = stylex.props(styles.paginationWrapper);
const paginationListStyleProps = stylex.props(styles.paginationList);
const paginationItemStyleProps = stylex.props(styles.paginationItem);
const paginationIconItemStyleProps = stylex.props(styles.paginationItem, styles.paginationIconItem);
const paginationDelimiterStyleProps = stylex.props(
  styles.paginationItem,
  styles.paginationDelimiter,
);
const paginationInputStyleProps = stylex.props(styles.paginationInput);
const paginationLabelStyleProps = stylex.props(styles.paginationLabel);
const paginationOffLabelStyleProps = stylex.props(
  styles.paginationLabel,
  styles.paginationOffLabel,
);
const paginationPrevIconStyleProps = stylex.props(styles.paginationIcon, styles.paginationPrevIcon);
const paginationNextIconStyleProps = stylex.props(styles.paginationIcon, styles.paginationNextIcon);

export const Route = createFileRoute("/sites/postList")({
  component: SitePostListRoute,
  validateSearch: (search: Record<string, unknown>): PostListRouteSearch => ({
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : undefined,
  }),
});

function SitePostListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SitePostListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SitePostListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { pageNum } = Route.useSearch();
  const currentPage = pageNum ?? 1;
  const { t } = useLegacyMessages();
  const query = useQuery(sitePostsQueryOptions(runtimeConfig, { page: currentPage }));
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
                data-stylex-owner="site-post-list-title-strip"
              >
                <h2 {...titleStyleProps} className={`pull-left ${titleStyleProps.className ?? ""}`}>
                  <LegacyMessage messageKey="site.sidebar.postList" />
                </h2>
              </div>
              <ul
                {...postListContainerStyleProps}
                className={`post-list-wrap ${postListContainerStyleProps.className ?? ""}`}
                data-stylex-owner="site-post-list-container"
              >
                {(query.data?.posts ?? []).map((post, index) => (
                  <PostListItem
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    even={index % 2 === 1}
                    post={post}
                  />
                ))}
              </ul>

              <PostListPagination
                currentPage={query.data?.page ?? currentPage}
                totalPages={query.data?.totalPages ?? 0}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PostListPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div
      {...paginationWrapperStyleProps}
      className={paginationWrapperStyleProps.className}
      data-stylex-owner="site-post-list-pagination"
      id="pagination"
    >
      <ul
        {...paginationListStyleProps}
        className={paginationListStyleProps.className}
        data-stylex-owner="site-post-list-pagination-list"
      >
        <li
          {...paginationIconItemStyleProps}
          className={paginationIconItemStyleProps.className}
          data-pagination-variant="icon"
          data-stylex-owner="site-post-list-pagination-item"
        >
          {hasPrev ? (
            <Link
              {...legacyPaginationLinkProps}
              search={{ pageNum: currentPage - 1 }}
              to="/sites/postList"
            >
              <i
                {...paginationPrevIconStyleProps}
                className={`ico btn-pg-prev ${paginationPrevIconStyleProps.className ?? ""}`}
                data-stylex-owner="site-post-list-pagination-icon"
              ></i>
              <span
                {...paginationLabelStyleProps}
                className={paginationLabelStyleProps.className}
                data-stylex-owner="site-post-list-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                {...paginationPrevIconStyleProps}
                className={`ico btn-pg-prev off ${paginationPrevIconStyleProps.className ?? ""}`}
                data-pagination-state="off"
                data-stylex-owner="site-post-list-pagination-icon"
              ></i>
              <span
                {...paginationOffLabelStyleProps}
                className={paginationOffLabelStyleProps.className}
                data-pagination-state="off"
                data-stylex-owner="site-post-list-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li
          {...paginationItemStyleProps}
          className={paginationItemStyleProps.className}
          data-stylex-owner="site-post-list-pagination-item"
        >
          <input
            {...paginationInputStyleProps}
            className={`nospinner ${paginationInputStyleProps.className ?? ""}`}
            data-stylex-owner="site-post-list-pagination-input"
            key={`${currentPage}-${totalPages}`}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              const inputValue = event.currentTarget.value;
              if (!/^[0-9]+$/.test(inputValue)) {
                event.currentTarget.value = String(currentPage);
                return;
              }

              const pageNum = Number(inputValue);
              const nextPage = Math.min(Math.max(pageNum, 1), totalPages);
              event.currentTarget.value = String(nextPage);
              void router.navigate({
                search: { pageNum: nextPage },
                to: "/sites/postList",
              });
            }}
            pattern="[0-9]*"
            type="number"
            defaultValue={currentPage}
          />
        </li>
        <li
          {...paginationDelimiterStyleProps}
          className={paginationDelimiterStyleProps.className}
          data-pagination-variant="delimiter"
          data-stylex-owner="site-post-list-pagination-item"
        >
          /
        </li>
        <li
          {...paginationItemStyleProps}
          className={paginationItemStyleProps.className}
          data-stylex-owner="site-post-list-pagination-item"
        >
          {totalPages}
        </li>
        <li
          {...paginationIconItemStyleProps}
          className={paginationIconItemStyleProps.className}
          data-pagination-variant="icon"
          data-stylex-owner="site-post-list-pagination-item"
        >
          {hasNext ? (
            <Link
              {...legacyPaginationLinkProps}
              search={{ pageNum: currentPage + 1 }}
              to="/sites/postList"
            >
              <span
                {...paginationLabelStyleProps}
                className={paginationLabelStyleProps.className}
                data-stylex-owner="site-post-list-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...paginationNextIconStyleProps}
                className={`ico btn-pg-next ${paginationNextIconStyleProps.className ?? ""}`}
                data-stylex-owner="site-post-list-pagination-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span
                {...paginationOffLabelStyleProps}
                className={paginationOffLabelStyleProps.className}
                data-pagination-state="off"
                data-stylex-owner="site-post-list-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...paginationNextIconStyleProps}
                className={`ico btn-pg-next off ${paginationNextIconStyleProps.className ?? ""}`}
                data-pagination-state="off"
                data-stylex-owner="site-post-list-pagination-icon"
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="active">
        <Link
          {...legacySiteSidebarLinkProps}
          mask={{ to: "/sites/postList" }}
          search={legacyCurrentSitePostListSidebarSearch}
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/issueList">
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

function PostListItem({ even, post }: { even: boolean; post: SitePost }) {
  const projectLogoUrl = legacyProjectLogoUrl(post.projectLogoUrl);
  const createdTitle = post.createdTitle ?? post.createdLabel;
  const postListRowStyleProps = stylex.props(styles.postListRow, even && styles.postListRowEven);

  return (
    <li
      {...postListRowStyleProps}
      className={`row-fluid ${postListRowStyleProps.className ?? ""}`}
      data-stylex-owner="site-post-list-row"
    >
      <Link
        {...postListProjectAvatarStyleProps}
        data-stylex-owner="site-post-list-project-avatar"
        params={{ ownerName: post.ownerName, projectName: post.projectName }}
        to="/$ownerName/$projectName"
      >
        <img
          {...postListProjectAvatarImageStyleProps}
          data-stylex-owner="site-post-list-project-avatar-image"
          src={projectLogoUrl}
          alt={post.projectName}
        />
      </Link>
      <div {...postInfoStyleProps} data-stylex-owner="site-post-list-info">
        <Link
          {...postProjectLinkStyleProps}
          data-stylex-owner="site-post-list-project-link"
          params={{ ownerName: post.ownerName, projectName: post.projectName }}
          to="/$ownerName/$projectName"
        >
          {post.ownerName}/{post.projectName}
        </Link>
        <span {...postInfoSeparatorStyleProps} data-stylex-owner="site-post-list-separator">
          ·
        </span>
        <Link
          {...postTitleLinkStyleProps}
          data-stylex-owner="site-post-list-title-link"
          params={{
            ownerName: post.ownerName,
            postNumber: post.postNumber,
            projectName: post.projectName,
          }}
          to="/$ownerName/$projectName/post/$postNumber"
        >
          {post.title}
        </Link>
      </div>
      <div {...postMetadataStyleProps} data-stylex-owner="site-post-list-metadata">
        <Link
          {...postAuthorAvatarStyleProps}
          data-stylex-owner="site-post-list-author-avatar"
          params={{ user: post.authorLoginId }}
          search={legacyUserLinkSearch}
          to="/$user"
        >
          {isDefaultAuthorAvatar(post.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img
              {...postAuthorAvatarImageStyleProps}
              data-stylex-owner="site-post-list-author-avatar-image"
              src={post.authorAvatarUrl}
            />
          ) : (
            <img
              {...postAuthorAvatarImageStyleProps}
              data-stylex-owner="site-post-list-author-avatar-image"
              src={post.authorAvatarUrl}
              alt={post.authorLabel}
              width="16"
              height="16"
            />
          )}
        </Link>
        <Link
          {...postMetadataItemStyleProps}
          data-stylex-owner="site-post-list-metadata-item"
          params={{ user: post.authorLoginId }}
          search={legacyUserLinkSearch}
          to="/$user"
        >
          {post.authorLabel}
        </Link>
        <span
          {...postMetadataItemStyleProps}
          data-stylex-owner="site-post-list-metadata-item"
          title={createdTitle}
        >
          {post.createdLabel}
        </span>
        <span {...postMetadataItemStyleProps} data-stylex-owner="site-post-list-metadata-item">
          <Link
            hash="comments"
            params={{
              ownerName: post.ownerName,
              postNumber: post.postNumber,
              projectName: post.projectName,
            }}
            to="/$ownerName/$projectName/post/$postNumber"
          >
            <i
              {...postCommentsIconStyleProps}
              className={`yobicon-comments ${postCommentsIconStyleProps.className ?? ""}`}
              data-stylex-owner="site-post-list-comments-icon"
            ></i>
            {post.commentCount}
          </Link>
        </span>
      </div>
    </li>
  );
}

function legacyProjectLogoUrl(projectLogoUrl: string) {
  return projectLogoUrl.trim() || "/assets/images/project_default_logo.png";
}

function isDefaultAuthorAvatar(avatarUrl: string) {
  return (
    /^https:\/\/www\.gravatar\.com\/avatar\/[^?]+\?s=16&d=https%3A%2F%2Fko\.gravatar\.com%2Fuserimage%2F53495145%2F0eaeeb47c620542ad089f17377298af6\.png$/u.test(
      avatarUrl,
    ) || /\/assets\/images\/default-avatar-\d+\.png$/u.test(avatarUrl)
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
