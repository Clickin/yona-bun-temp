import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import { sitePostsQueryOptions, siteUpdateQueryOptions, type SitePost } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { globalBreakpoints } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";
import { sitePostListColors } from "./-postList.stylex";

type PostListRouteSearch = {
  pageNum?: number;
};

const paginationStyles = stylex.create({
  paginationSprite: (spriteUrl: string) => ({
    "--site-post-list-pagination-sprite": `url(${spriteUrl})`,
  }),
});

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
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: {
      "@media (max-width: 720px)": "10px",
    },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: {
    margin: "0px auto",
  },
  breadcrumbHeading: {
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "24.5px",
    fontWeight: "700",
    lineHeight: "30px",
    margin: "10px 0px",
    padding: "10px 10px 5px",
    textRendering: "optimizeLegibility",
  },
  pageWrapOuter: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: { "@media (max-width: 720px)": "10px" },
    padding: { default: "0px 10px", "@media (max-width: 720px)": "0px" },
    width: "100%",
  },
  settingWrap: { margin: "0px auto" },
  settingGrid: {
    width: "100%",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  settingColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    minHeight: "30px",
  },
  settingSidebarColumn: { marginLeft: "0px", width: "14.893617021276595%" },
  settingContentColumn: {
    marginLeft: "2.127659574468085%",
    width: "82.97872340425532%",
  },
  sidebar: {
    margin: "0px",
    padding: "0px",
    listStyle: "none",
  },
  sidebarItem: {
    borderLeftColor: sitePostListColors.neutralBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarFirstItem: { marginTop: "0px" },
  sidebarActiveItem: {
    borderLeftColor: sitePostListColors.accent,
    fontWeight: "bold",
  },
  sidebarLink: {
    backgroundColor: {
      ":hover": sitePostListColors.neutralBorder,
      ":focus": sitePostListColors.neutralBorder,
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
    backgroundColor: sitePostListColors.badgeSurface,
    borderColor: sitePostListColors.badgeBorder,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: sitePostListColors.badgeShadow,
    color: sitePostListColors.badgeText,
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
    borderBottomColor: sitePostListColors.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: sitePostListColors.titleText,
    lineHeight: "30px",
    float: "left",
  },
  postListContainer: {
    listStyle: "none",
    marginLeft: {
      default: "0px",
      [globalBreakpoints.mobile]: "10px",
    },
  },
  postListRow: {
    width: "100%",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
    paddingBlock: "10px",
    paddingInline: "0px",
    borderBottomColor: sitePostListColors.rowBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    lineHeight: "70px",
  },
  postListRowEven: {
    backgroundColor: sitePostListColors.evenRowSurface,
  },
  postListProjectAvatar: {
    width: "45px",
    height: "45px",
    marginRight: "10px",
    marginTop: "3px",
    float: "left",
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    backgroundColor: sitePostListColors.titleBorder,
    borderRadius: "3px",
  },
  postListProjectAvatarImage: {
    width: "100%",
    verticalAlign: "top",
  },
  postInfo: {
    lineHeight: "20px",
    marginTop: "5px",
  },
  postProjectLink: {
    fontSize: "15px",
    fontWeight: "bold",
    display: "inline-block",
    lineHeight: "20px",
    color: sitePostListColors.linkText,
  },
  postInfoSeparator: {
    fontSize: "15px",
    fontWeight: "bold",
    paddingInline: "5px",
  },
  postTitleLink: {
    fontSize: "15px",
    fontWeight: "bold",
  },
  postMetadata: {
    fontSize: "11px",
    lineHeight: "20px",
  },
  postAuthorAvatar: {
    width: "14px",
    height: "14px",
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    backgroundColor: sitePostListColors.titleBorder,
    borderRadius: "3px",
  },
  postAuthorAvatarImage: {
    width: "100%",
    verticalAlign: "top",
  },
  postMetadataItem: {
    marginBlock: "0px",
    marginInline: "5px",
  },
  postCommentsIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "middle",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e4b7"' },
  },
  paginationWrapper: {
    width: "100%",
    textAlign: "center",
    margin: "20px 0px",
    clear: "both",
  },
  paginationList: {
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
  paginationItem: {
    display: "inline-block",
    padding: "0px 10px",
    fontSize: "12px",
    color: sitePostListColors.mutedText,
  },
  paginationIconItem: {
    padding: "0px 5px",
  },
  paginationDelimiter: {
    color: sitePostListColors.titleBorder,
    padding: "0px 5px",
  },
  paginationInput: {
    MozAppearance: "textfield",
    margin: "0px",
    width: "30px",
    textAlign: "center",
    fontWeight: "bold",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: sitePostListColors.neutralBorder,
      ":hover": sitePostListColors.accent,
      ":focus": sitePostListColors.accent,
    },
    color: {
      ":hover": sitePostListColors.accent,
      ":focus": sitePostListColors.accent,
    },
    boxShadow: {
      ":hover": sitePostListColors.inputShadow,
      ":focus": sitePostListColors.inputShadow,
    },
  },
  paginationLabel: {
    fontSize: "11px",
    color: sitePostListColors.accent,
  },
  paginationOffLabel: {
    color: sitePostListColors.mutedText,
  },
  paginationIcon: {
    backgroundImage: "var(--site-post-list-pagination-sprite)",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    verticalAlign: "middle",
    width: "6px",
    height: "9px",
  },
  paginationPrevIcon: {
    backgroundPosition: "-136px -139px",
    marginRight: "10px",
  },
  paginationPrevIconDisabled: {
    backgroundPosition: "-164px -2px",
  },
  paginationNextIcon: {
    backgroundPosition: "-146px -139px",
    marginLeft: "10px",
  },
  paginationNextIconDisabled: {
    backgroundPosition: "-23px -13px",
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
const paginationPrevDisabledIconStyleProps = stylex.props(
  styles.paginationIcon,
  styles.paginationPrevIcon,
  styles.paginationPrevIconDisabled,
);
const paginationNextIconStyleProps = stylex.props(styles.paginationIcon, styles.paginationNextIcon);
const paginationNextDisabledIconStyleProps = stylex.props(
  styles.paginationIcon,
  styles.paginationNextIcon,
  styles.paginationNextIconDisabled,
);

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
      <div
        {...stylex.props(styles.breadcrumbOuter)}
        data-stylex-owner="site-post-list-breadcrumb-outer"
      >
        <div
          {...stylex.props(styles.breadcrumbInner)}
          data-stylex-owner="site-post-list-breadcrumb-inner"
        >
          <h3
            {...stylex.props(styles.breadcrumbHeading)}
            data-stylex-owner="site-post-list-breadcrumb-heading"
          >
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div
        {...stylex.props(styles.pageWrapOuter)}
        data-stylex-owner="site-post-list-page-wrap-outer"
      >
        <div
          {...stylex.props(styles.settingWrap)}
          data-stylex-owner="site-post-list-setting-wrap"
          data-stylex-owner-page="site-post-list-page"
        >
          <div
            {...stylex.props(styles.settingGrid)}
            data-stylex-owner="site-post-list-setting-grid"
          >
            <div
              {...stylex.props(styles.settingColumn, styles.settingSidebarColumn)}
              data-stylex-owner="site-post-list-setting-sidebar-column"
            >
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div
              {...stylex.props(styles.settingColumn, styles.settingContentColumn)}
              data-stylex-owner="site-post-list-setting-content-column"
            >
              <div {...titleAreaStyleProps} data-stylex-owner="site-post-list-title-strip">
                <h2 {...titleStyleProps} data-stylex-owner="site-post-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.postList" />
                </h2>
              </div>
              <ul {...postListContainerStyleProps} data-stylex-owner="site-post-list-container">
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
                data-stylex-owner="site-post-list-pagination-dynamic-sprite"
                {...stylex.props(paginationStyles.paginationSprite(legacySpriteUrl))}
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
                {...paginationPrevDisabledIconStyleProps}
                data-pagination-state="off"
                data-stylex-owner="site-post-list-pagination-dynamic-sprite"
                {...stylex.props(paginationStyles.paginationSprite(legacySpriteUrl))}
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
                data-stylex-owner="site-post-list-pagination-dynamic-sprite"
                {...stylex.props(paginationStyles.paginationSprite(legacySpriteUrl))}
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
                {...paginationNextDisabledIconStyleProps}
                data-pagination-state="off"
                data-stylex-owner="site-post-list-pagination-dynamic-sprite"
                {...stylex.props(paginationStyles.paginationSprite(legacySpriteUrl))}
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
    <ul {...stylex.props(styles.sidebar)} data-stylex-owner="site-post-list-sidebar">
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarFirstItem)}
        data-stylex-owner="site-post-list-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          to="/sites/userList"
        >
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarActiveItem)}
        data-stylex-owner="site-post-list-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink, styles.sidebarActiveLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          mask={{ to: "/sites/postList" }}
          search={legacyCurrentSitePostListSidebarSearch}
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-post-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-post-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          to="/sites/projectList"
        >
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-post-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          to="/sites/mail"
        >
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-post-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-post-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          to="/sites/update"
        >
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? (
            <span
              {...stylex.props(styles.sidebarBadge)}
              data-stylex-owner="site-post-list-sidebar-badge"
            >
              1
            </span>
          ) : null}
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-post-list-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-post-list-sidebar-link"
          to="/sites/diagnostic"
        >
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
      className={postListRowStyleProps.className}
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
            <i {...postCommentsIconStyleProps} data-stylex-owner="site-post-list-comments-icon"></i>
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
