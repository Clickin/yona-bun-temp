/* oxlint-disable jsx-a11y/no-autofocus -- legacy project/list.scala.html sets autofocus on the directory filter input. */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, type SearchSchemaInput, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { apiQueryKeys } from "../api/query-keys";
import { restFetch } from "../api/rest-client";
import type { ListProjectsResponse, YoramRecord } from "../api/types";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import "../yobicon-font.css";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { globalBreakpoints } from "../theme.stylex";
import { SiteLayoutShell } from "./-home-route-screen";
import { projectsDirectoryColors } from "./-projects.stylex";

type ProjectsSearch = {
  filter: string;
  labelIds: number | string;
  pageNum?: number;
};
type ProjectsSearchInput = Partial<ProjectsSearch> & SearchSchemaInput;

const LEGACY_PROJECTS_LINK_SEARCH = {
  filter: undefined,
  labelIds: undefined,
  pageNum: undefined,
};

type ProjectDirectoryItem = YoramRecord & {
  createdLabel?: string;
  createdTitle?: string;
  isForked?: boolean;
  lastPushedLabel?: string;
  logoUrl?: string;
  memberCount?: number;
  members?: YoramRecord[];
  overview?: string;
  originOwnerName?: string;
  originProjectName?: string;
  ownerName?: string;
  projectName?: string;
  projectScope?: string;
  watchCount?: number;
};

type ProjectDirectoryLabel = {
  category: string;
  id: string;
  name: string;
};

const styles = stylex.create({
  paginationSprite: (spriteUrl: string) => ({
    "--projects-directory-pagination-sprite": `url(${spriteUrl})`,
  }),
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: { default: null, [globalBreakpoints.mobile]: "10px" },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: { margin: "0px auto" },
  directoryPageWrap: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: { default: null, [globalBreakpoints.mobile]: "10px" },
    padding: { default: "0px 10px", [globalBreakpoints.mobile]: "0px" },
    width: "100%",
  },
  directoryPage: {
    margin: "5px auto 0px",
    width: "100%",
  },
  directoryTabsList: {
    borderBottomColor: projectsDirectoryColors.tabBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    listStyle: "none",
    margin: "10px 0px 20px",
    padding: "0px",
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
  directoryTabsItem: {
    float: "left",
    fontSize: "16px",
    fontWeight: "400",
    marginBottom: "-2px",
  },
  directoryTabsLink: {
    backgroundColor: {
      default: "transparent",
      ":hover": projectsDirectoryColors.tabHoverSurface,
      ":focus": projectsDirectoryColors.tabFocusSurface,
    },
    borderBottomColor: {
      default: "transparent",
      ":hover": projectsDirectoryColors.tabBorder,
      ":focus": projectsDirectoryColors.tabBorder,
    },
    borderLeftColor: {
      default: "transparent",
      ":hover": projectsDirectoryColors.tabHoverBorder,
      ":focus": projectsDirectoryColors.tabHoverBorder,
    },
    borderRightColor: {
      default: "transparent",
      ":hover": projectsDirectoryColors.tabHoverBorder,
      ":focus": projectsDirectoryColors.tabHoverBorder,
    },
    borderTopColor: {
      default: "transparent",
      ":hover": projectsDirectoryColors.tabHoverBorder,
      ":focus": projectsDirectoryColors.tabHoverBorder,
    },
    borderRadius: "4px 4px 0px 0px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: projectsDirectoryColors.tabText,
    display: "block",
    fontWeight: "700",
    lineHeight: "20px",
    marginRight: "2px",
    padding: { default: "8px 30px", [globalBreakpoints.mobile]: "8px 5px" },
    textDecoration: { default: "none", ":hover": "none", ":focus": "none" },
  },
  directoryTabsActiveLink: {
    backgroundColor: {
      default: projectsDirectoryColors.tabSurface,
      ":hover": projectsDirectoryColors.tabSurface,
      ":focus": projectsDirectoryColors.tabSurface,
    },
    borderBottomColor: { default: "transparent", ":hover": "transparent", ":focus": "transparent" },
    borderLeftColor: {
      default: projectsDirectoryColors.tabBorder,
      ":hover": projectsDirectoryColors.tabBorder,
      ":focus": projectsDirectoryColors.tabBorder,
    },
    borderRightColor: {
      default: projectsDirectoryColors.tabBorder,
      ":hover": projectsDirectoryColors.tabBorder,
      ":focus": projectsDirectoryColors.tabBorder,
    },
    borderTopColor: {
      default: projectsDirectoryColors.tabBorder,
      ":hover": projectsDirectoryColors.tabBorder,
      ":focus": projectsDirectoryColors.tabBorder,
    },
    color: projectsDirectoryColors.tabActiveText,
    cursor: "default",
  },
  directorySearchWrap: {
    clear: "both",
    height: { default: "30px", [globalBreakpoints.mobile]: "inherit" },
    padding: "10px 0px",
  },
  directorySearchContainer: { float: "left" },
  directorySearchForm: { margin: "0px 0px 2px" },
  directorySearchBar: {
    backgroundColor: projectsDirectoryColors.searchSurface,
    borderColor: projectsDirectoryColors.searchBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    height: "20px",
    lineHeight: "20px",
    margin: { default: "0px", [globalBreakpoints.mobile]: "5px 0px" },
    padding: "4px 25px 4px 5px",
    position: "relative",
  },
  directorySearchInput: {
    backgroundColor: projectsDirectoryColors.searchSurface,
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    color: projectsDirectoryColors.searchText,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: "12px",
    height: "20px",
    margin: "0px -5px",
    outlineStyle: "none",
    outlineWidth: "0px",
    padding: "0px 5px",
    transition: "width 0.15s ease",
    width: { default: "350px", [globalBreakpoints.mobile]: "inherit" },
  },
  directorySearchButton: {
    backgroundColor: {
      default: "transparent",
      ":hover": "transparent",
      ":focus": "transparent",
    },
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    fontSize: "12px",
    height: "20px",
    outlineStyle: "none",
    outlineWidth: "0px",
    position: "absolute",
    right: "5px",
    top: "5px",
  },
  yobicon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "400",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  directorySearchIcon: { "::before": { content: '"\\e225"' } },
  directoryList: {
    clear: "both",
    listStyle: "none",
    margin: "0px 0px 20px",
  },
  directoryRow: {
    borderBottomColor: projectsDirectoryColors.rowDivider,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    overflow: "hidden",
    padding: "15px 0px 10px",
  },
  directoryOwnerAvatar: {
    borderRadius: "3px",
    display: "inline",
    float: "left",
    height: "50px",
    marginRight: "10px",
    overflow: "hidden",
    position: "relative",
    width: "50px",
  },
  directoryOwnerAvatarImage: {
    height: "100%",
    verticalAlign: "top",
    width: "100%",
  },
  directoryReadableIdentity: { float: "left" },
  directoryHeader: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "5px",
    marginLeft: "10px",
  },
  directoryDescription: {
    color: projectsDirectoryColors.descriptionText,
    marginLeft: "10px",
    maxHeight: "100px",
    maxWidth: "647px",
    overflowY: "auto",
    textOverflow: "ellipsis",
  },
  directoryNameTag: {
    color: projectsDirectoryColors.metadataText,
    fontSize: "11px",
    margin: "0px 0px 0px 10px",
  },
  directoryTitleLink: {
    color: {
      default: projectsDirectoryColors.titleText,
      ":hover": projectsDirectoryColors.linkInteractive,
      ":focus": projectsDirectoryColors.linkInteractive,
    },
    outlineStyle: "none",
    textDecoration: { default: "none", ":hover": "underline", ":focus": "underline" },
  },
  directoryForkOrigin: {
    color: projectsDirectoryColors.forkOriginText,
    fontSize: "10px",
    fontWeight: "400",
    lineHeight: "20px",
  },
  directoryForkOriginLink: {
    color: {
      default: projectsDirectoryColors.forkOriginText,
      ":hover": projectsDirectoryColors.linkInteractive,
      ":focus": projectsDirectoryColors.linkInteractive,
    },
    outlineStyle: "none",
    textDecoration: { default: "none", ":hover": "underline", ":focus": "underline" },
  },
  directoryForkSplitIcon: { "::before": { content: '"\\e450"' } },
  directoryPrivateLock: {
    color: projectsDirectoryColors.privateLockText,
    fontSize: "14px",
  },
  directoryPrivateLockIcon: { "::before": { content: '"\\e21e"' } },
  directoryProjectLabel: {
    backgroundColor: projectsDirectoryColors.projectLabelSurface,
    borderRadius: "2px",
    borderStyle: "none",
    color: {
      default: projectsDirectoryColors.projectLabelText,
      ":hover": projectsDirectoryColors.linkInteractive,
      ":focus": projectsDirectoryColors.linkInteractive,
    },
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "700",
    lineHeight: "20px",
    outlineStyle: "none",
    padding: "1px 5px",
    textDecoration: { default: "none", ":hover": "underline", ":focus": "underline" },
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  directoryOwnerLink: {
    color: {
      default: projectsDirectoryColors.metadataText,
      ":hover": projectsDirectoryColors.linkInteractive,
      ":focus": projectsDirectoryColors.linkInteractive,
    },
    outlineStyle: "none",
    textDecoration: { default: "none", ":hover": "underline", ":focus": "underline" },
  },
  directoryCodeUpdate: {
    color: projectsDirectoryColors.metadataText,
    fontSize: "10px",
    fontWeight: "400",
    lineHeight: "20px",
  },
  directoryStats: {
    float: "right",
    marginTop: "0px",
    textAlign: "right",
  },
  directoryMembers: { width: "100%" },
  directoryMembersList: {
    display: "inline-block",
    listStyle: "none",
    margin: "0px",
    overflow: "hidden",
    paddingLeft: "50px",
  },
  directoryMemberItem: {
    float: "right",
    lineHeight: "20px",
  },
  directoryMemberAvatar: {
    backgroundColor: projectsDirectoryColors.memberAvatarSurface,
    borderRadius: "3px",
    display: "inline-block",
    height: "32px",
    margin: "0px 3px 3px 0px",
    overflow: "hidden",
    verticalAlign: "middle",
    width: "32px",
  },
  directoryStatsIcon: {
    fontSize: "16px",
    marginBottom: "3px",
    marginLeft: "5px",
    marginRight: "5px",
    verticalAlign: "bottom",
  },
  directoryStatsFriendsIcon: { "::before": { content: '"\\e27b"' } },
  directoryStatsEyeIcon: { "::before": { content: '"\\e52e"' } },
  directoryMemberAvatarImage: {
    verticalAlign: "top",
    width: "100%",
  },
  directoryMemberCount: {
    color: projectsDirectoryColors.memberCountText,
    fontWeight: "700",
  },
  directoryEmptyState: {
    padding: "100px 0px",
    textAlign: "center",
  },
  directoryEmptyIcon: {
    backgroundImage: "var(--projects-directory-empty-state-sprite)",
    backgroundPosition: "-5px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "82px",
    verticalAlign: "middle",
    width: "62px",
  },
  directoryEmptyMessage: {
    color: projectsDirectoryColors.emptyText,
    fontSize: "16px",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "30px 0px",
  },
  directoryPagination: {
    clear: "both",
    margin: "20px 0px",
    textAlign: "center",
    width: "100%",
  },
  directoryPaginationList: {
    display: "inline-block",
    fontSize: "0px",
    listStyle: "none",
    margin: "0px",
    marginLeft: "-120px",
    padding: "0px",
  },
  directoryPaginationItem: {
    color: projectsDirectoryColors.paginationText,
    display: "inline-block",
    fontSize: "12px",
    padding: "0px 10px",
  },
  directoryPaginationIconItem: { padding: "0px 5px" },
  directoryPaginationDelimiterItem: {
    color: projectsDirectoryColors.paginationDelimiter,
    padding: "0px 5px",
  },
  directoryPaginationLabel: {
    color: projectsDirectoryColors.paginationAccent,
    fontSize: "11px",
  },
  directoryPaginationLabelDisabled: { color: projectsDirectoryColors.paginationText },
  directoryPaginationInput: {
    MozAppearance: "textfield",
    borderColor: {
      default: projectsDirectoryColors.paginationInputBorder,
      ":hover": projectsDirectoryColors.paginationAccent,
      ":focus": projectsDirectoryColors.paginationAccent,
    },
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: {
      ":hover": projectsDirectoryColors.paginationInputInteractiveShadow,
      ":focus": projectsDirectoryColors.paginationInputInteractiveShadow,
    },
    color: {
      ":hover": projectsDirectoryColors.paginationAccent,
      ":focus": projectsDirectoryColors.paginationAccent,
    },
    fontWeight: "700",
    margin: "0px",
    textAlign: "center",
    width: "30px",
  },
  directoryPaginationIcon: {
    backgroundImage: "var(--projects-directory-pagination-sprite)",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "9px",
    verticalAlign: "middle",
    width: "6px",
  },
  directoryPaginationPreviousIcon: {
    backgroundPosition: "-136px -139px",
    marginRight: "10px",
  },
  directoryPaginationPreviousIconDisabled: { backgroundPosition: "-164px -2px" },
  directoryPaginationNextIcon: {
    backgroundPosition: "-146px -139px",
    marginLeft: "10px",
  },
  directoryPaginationNextIconDisabled: { backgroundPosition: "-23px -13px" },
});

const projectsDirectoryDynamicStyles = stylex.create({
  emptyIconSprite: (backgroundImage: string) => ({ backgroundImage }),
});

const breadcrumbOuterStyleProps = stylex.props(styles.breadcrumbOuter);
const breadcrumbInnerStyleProps = stylex.props(styles.breadcrumbInner);
const directoryPageWrapStyleProps = stylex.props(styles.directoryPageWrap);
const directoryPageStyleProps = stylex.props(styles.directoryPage);
const directoryTabsListStyleProps = stylex.props(styles.directoryTabsList);
const directoryTabsItemStyleProps = stylex.props(styles.directoryTabsItem);
const directoryTabsLinkStyleProps = stylex.props(styles.directoryTabsLink);
const directoryTabsActiveLinkStyleProps = stylex.props(
  styles.directoryTabsLink,
  styles.directoryTabsActiveLink,
);
const directorySearchWrapStyleProps = stylex.props(styles.directorySearchWrap);
const directorySearchContainerStyleProps = stylex.props(styles.directorySearchContainer);
const directorySearchFormStyleProps = stylex.props(styles.directorySearchForm);
const directorySearchBarStyleProps = stylex.props(styles.directorySearchBar);
const directorySearchInputStyleProps = stylex.props(styles.directorySearchInput);
const directorySearchButtonStyleProps = stylex.props(styles.directorySearchButton);
const directorySearchIconStyleProps = stylex.props(styles.yobicon, styles.directorySearchIcon);
const directoryListStyleProps = stylex.props(styles.directoryList);
const directoryRowStyleProps = stylex.props(styles.directoryRow);
const directoryOwnerAvatarStyleProps = stylex.props(styles.directoryOwnerAvatar);
const directoryOwnerAvatarImageStyleProps = stylex.props(styles.directoryOwnerAvatarImage);
const directoryReadableIdentityStyleProps = stylex.props(styles.directoryReadableIdentity);
const directoryHeaderStyleProps = stylex.props(styles.directoryHeader);
const directoryDescriptionStyleProps = stylex.props(styles.directoryDescription);
const directoryNameTagStyleProps = stylex.props(styles.directoryNameTag);
const directoryTitleLinkStyleProps = stylex.props(styles.directoryTitleLink);
const directoryForkOriginStyleProps = stylex.props(styles.directoryForkOrigin);
const directoryForkOriginLinkStyleProps = stylex.props(styles.directoryForkOriginLink);
const directoryForkSplitIconStyleProps = stylex.props(
  styles.yobicon,
  styles.directoryForkSplitIcon,
);
const directoryPrivateLockStyleProps = stylex.props(
  styles.yobicon,
  styles.directoryPrivateLock,
  styles.directoryPrivateLockIcon,
);
const directoryProjectLabelStyleProps = stylex.props(styles.directoryProjectLabel);
const directoryOwnerLinkStyleProps = stylex.props(styles.directoryOwnerLink);
const directoryCodeUpdateStyleProps = stylex.props(styles.directoryCodeUpdate);
const directoryStatsStyleProps = stylex.props(styles.directoryStats);
const directoryMembersStyleProps = stylex.props(styles.directoryMembers);
const directoryMembersListStyleProps = stylex.props(styles.directoryMembersList);
const directoryMemberItemStyleProps = stylex.props(styles.directoryMemberItem);
const directoryMemberAvatarStyleProps = stylex.props(styles.directoryMemberAvatar);
const directoryStatsFriendsIconStyleProps = stylex.props(
  styles.yobicon,
  styles.directoryStatsIcon,
  styles.directoryStatsFriendsIcon,
);
const directoryStatsEyeIconStyleProps = stylex.props(
  styles.yobicon,
  styles.directoryStatsIcon,
  styles.directoryStatsEyeIcon,
);
const directoryMemberAvatarImageStyleProps = stylex.props(styles.directoryMemberAvatarImage);
const directoryMemberCountStyleProps = stylex.props(styles.directoryMemberCount);
const directoryEmptyStateStyleProps = stylex.props(styles.directoryEmptyState);
const directoryEmptyIconStyleProps = stylex.props(styles.directoryEmptyIcon);
const directoryEmptyMessageStyleProps = stylex.props(styles.directoryEmptyMessage);
const directoryPaginationStyleProps = stylex.props(styles.directoryPagination);
const directoryPaginationListStyleProps = stylex.props(styles.directoryPaginationList);
const directoryPaginationItemStyleProps = stylex.props(styles.directoryPaginationItem);
const directoryPaginationIconItemStyleProps = stylex.props(
  styles.directoryPaginationItem,
  styles.directoryPaginationIconItem,
);
const directoryPaginationDelimiterItemStyleProps = stylex.props(
  styles.directoryPaginationItem,
  styles.directoryPaginationDelimiterItem,
);
const directoryPaginationLabelStyleProps = stylex.props(styles.directoryPaginationLabel);
const directoryPaginationDisabledLabelStyleProps = stylex.props(
  styles.directoryPaginationLabel,
  styles.directoryPaginationLabelDisabled,
);
const directoryPaginationInputStyleProps = stylex.props(styles.directoryPaginationInput);
const directoryPaginationPreviousIconStyleProps = stylex.props(
  styles.directoryPaginationIcon,
  styles.directoryPaginationPreviousIcon,
);
const directoryPaginationPreviousDisabledIconStyleProps = stylex.props(
  styles.directoryPaginationIcon,
  styles.directoryPaginationPreviousIcon,
  styles.directoryPaginationPreviousIconDisabled,
);
const directoryPaginationNextIconStyleProps = stylex.props(
  styles.directoryPaginationIcon,
  styles.directoryPaginationNextIcon,
);
const directoryPaginationNextDisabledIconStyleProps = stylex.props(
  styles.directoryPaginationIcon,
  styles.directoryPaginationNextIcon,
  styles.directoryPaginationNextIconDisabled,
);

export const Route = createFileRoute("/projects")({
  component: ProjectsRoute,
  validateSearch: (search: ProjectsSearchInput): ProjectsSearch => {
    const pageNum = positiveInteger(search.pageNum);
    return {
      filter: typeof search.filter === "string" ? search.filter : "",
      labelIds: stringSearch(search.labelIds),
      ...(pageNum ? { pageNum } : {}),
    };
  },
});

function ProjectsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectsScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const search = Route.useSearch();
  const { filter } = search;
  const { t } = useLegacyMessages();
  const projectsQuery = useQuery(projectsDirectoryQueryOptions(runtimeConfig, search));
  const projects = projectItems(projectsQuery.data);
  const totalPages = positiveIntegerField(projectsQuery.data, "totalPages", 1);
  const responsePage = positiveIntegerField(
    projectsQuery.data,
    "pageNum",
    positiveIntegerField(projectsQuery.data, "page", 1),
  );
  const currentPage = clampPageNum(search.pageNum ?? responsePage, totalPages);

  return (
    <SiteLayoutShell activeMenu="projects" runtimeConfig={runtimeConfig}>
      <title>{t("title.projectList")}</title>
      <div {...breadcrumbOuterStyleProps} data-stylex-owner="projects-breadcrumb-outer">
        <div {...breadcrumbInnerStyleProps} data-stylex-owner="projects-breadcrumb-inner">
          <div data-projects-directory-tabs-scope="">
            <ul {...directoryTabsListStyleProps} data-stylex-owner="projects-directory-tabs-list">
              <li
                {...directoryTabsItemStyleProps}
                data-selected="true"
                data-stylex-owner="projects-directory-tabs-item"
              >
                <Link
                  {...directoryTabsActiveLinkStyleProps}
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  search={LEGACY_PROJECTS_LINK_SEARCH}
                  data-stylex-owner="projects-directory-tabs-link"
                  to="/projects"
                >
                  {t("project.public")} {t("title.projectList")}
                </Link>
              </li>
              <li
                {...directoryTabsItemStyleProps}
                data-selected="false"
                data-stylex-owner="projects-directory-tabs-item"
              >
                <Link
                  {...directoryTabsLinkStyleProps}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  data-stylex-owner="projects-directory-tabs-link"
                  to="/orgs"
                >
                  {t("title.organization.list")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div {...directoryPageWrapStyleProps} data-stylex-owner="projects-directory-page-wrap">
        <div {...directoryPageStyleProps} data-stylex-owner="projects-directory-page">
          <div
            {...directorySearchWrapStyleProps}
            data-stylex-owner="projects-directory-search-wrap"
          >
            <div
              {...directorySearchContainerStyleProps}
              data-stylex-owner="projects-directory-search-container"
              id="search"
            >
              <form
                {...directorySearchFormStyleProps}
                action={prefixBasePath(runtimeConfig.basePath, "/projects")}
                data-stylex-owner="projects-directory-search-form"
                method="get"
              >
                <div
                  {...directorySearchBarStyleProps}
                  data-stylex-owner="projects-directory-search-bar"
                >
                  <input
                    {...directorySearchInputStyleProps}
                    data-stylex-owner="projects-directory-search-input"
                    name="filter"
                    type="text"
                    placeholder={t("site.project.filter")}
                    defaultValue={filter}
                    autoFocus
                  />
                  <button
                    {...directorySearchButtonStyleProps}
                    data-stylex-owner="projects-directory-search-button"
                    type="submit"
                  >
                    <i
                      {...directorySearchIconStyleProps}
                      data-stylex-owner="projects-directory-search-icon"
                    ></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          {projects.length === 0 ? (
            <div
              {...directoryEmptyStateStyleProps}
              data-stylex-owner="projects-directory-empty-state"
            >
              <i
                {...directoryEmptyIconStyleProps}
                {...stylex.props(
                  projectsDirectoryDynamicStyles.emptyIconSprite(`url(${legacySpriteUrl})`),
                )}
                data-stylex-owner="projects-directory-empty-icon"
                className={`${directoryEmptyIconStyleProps.className} ${stylex.props(projectsDirectoryDynamicStyles.emptyIconSprite(`url(${legacySpriteUrl})`)).className ?? ""}`.trim()}
              ></i>
              <p
                {...directoryEmptyMessageStyleProps}
                data-stylex-owner="projects-directory-empty-message"
              >
                {t("project.is.empty")}
              </p>
            </div>
          ) : (
            <>
              <ul {...directoryListStyleProps} data-stylex-owner="projects-directory-list">
                {projects.map((project) => (
                  <ProjectListItem
                    key={`${project.ownerName ?? ""}/${project.projectName ?? ""}`}
                    basePath={runtimeConfig.basePath}
                    project={project}
                  />
                ))}
              </ul>
              <ProjectsPagination
                currentPage={currentPage}
                filter={filter}
                labelIds={String(search.labelIds)}
                totalPages={totalPages}
              />
            </>
          )}
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function ProjectsPagination({
  currentPage,
  filter,
  labelIds,
  totalPages,
}: {
  currentPage: number;
  filter: string;
  labelIds: string;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (pageNum: number) => ({
    ...(filter ? { filter } : {}),
    ...(labelIds ? { labelIds: labelIdSearchValue(labelIds) } : {}),
    pageNum,
  });
  const navigateToPage = (pageNum: number) => {
    void router.navigate({
      search: pageSearch(pageNum),
      to: "/projects",
    });
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^[0-9]+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }
    const value = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(value);
    navigateToPage(value);
  };

  return (
    <div
      {...directoryPaginationStyleProps}
      data-stylex-owner="projects-directory-pagination"
      id="pagination"
    >
      <ul
        {...directoryPaginationListStyleProps}
        data-stylex-owner="projects-directory-pagination-list"
      >
        <li
          {...directoryPaginationIconItemStyleProps}
          data-pagination-kind="icon"
          data-stylex-owner="projects-directory-pagination-item"
        >
          {hasPrev ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              search={pageSearch(currentPage - 1)}
              to="/projects"
            >
              <i
                {...directoryPaginationPreviousIconStyleProps}
                data-disabled="false"
                data-stylex-owner="projects-directory-pagination-prev-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
              <span
                {...directoryPaginationLabelStyleProps}
                data-disabled="false"
                data-stylex-owner="projects-directory-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                {...directoryPaginationPreviousDisabledIconStyleProps}
                data-disabled="true"
                data-stylex-owner="projects-directory-pagination-prev-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
              <span
                {...directoryPaginationDisabledLabelStyleProps}
                data-disabled="true"
                data-stylex-owner="projects-directory-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li
          {...directoryPaginationItemStyleProps}
          data-pagination-kind="standard"
          data-stylex-owner="projects-directory-pagination-item"
        >
          <input
            {...directoryPaginationInputStyleProps}
            data-stylex-owner="projects-directory-pagination-input"
            defaultValue={currentPage}
            key={currentPage}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleInputKeyDown}
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li
          {...directoryPaginationDelimiterItemStyleProps}
          data-pagination-kind="delimiter"
          data-stylex-owner="projects-directory-pagination-item"
        >
          /
        </li>
        <li
          {...directoryPaginationItemStyleProps}
          data-pagination-kind="standard"
          data-stylex-owner="projects-directory-pagination-item"
        >
          {totalPages}
        </li>
        <li
          {...directoryPaginationIconItemStyleProps}
          data-pagination-kind="icon"
          data-stylex-owner="projects-directory-pagination-item"
        >
          {hasNext ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              search={pageSearch(currentPage + 1)}
              to="/projects"
            >
              <span
                {...directoryPaginationLabelStyleProps}
                data-disabled="false"
                data-stylex-owner="projects-directory-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...directoryPaginationNextIconStyleProps}
                data-disabled="false"
                data-stylex-owner="projects-directory-pagination-next-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
            </Link>
          ) : (
            <>
              <span
                {...directoryPaginationDisabledLabelStyleProps}
                data-disabled="true"
                data-stylex-owner="projects-directory-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...directoryPaginationNextDisabledIconStyleProps}
                data-disabled="true"
                data-stylex-owner="projects-directory-pagination-next-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function ProjectListItem({
  basePath,
  project,
}: {
  basePath: string;
  project: ProjectDirectoryItem;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const ownerName = stringField(project, "ownerName", "");
  const projectName = stringField(project, "projectName", "");
  const logoUrl = stringField(project, "logoUrl", "");
  const createdLabel = stringField(project, "createdLabel", "");
  const createdTitle = stringField(project, "createdTitle", createdLabel);
  const lastPushedLabel = stringField(project, "lastPushedLabel", "");
  const isForked = project.isForked === true;
  const originOwnerName = stringField(project, "originOwnerName", "");
  const originProjectName = stringField(project, "originProjectName", "");
  const labels = projectLabels(project);
  const memberCount = numberField(project, "memberCount", 0);
  const members = projectMembers(project);
  const watchCount = numberField(project, "watchCount", 0);

  return (
    <li {...directoryRowStyleProps} data-stylex-owner="projects-directory-row">
      <div data-stylex-owner="projects-directory-readable-info">
        <div
          {...directoryOwnerAvatarStyleProps}
          className={directoryOwnerAvatarStyleProps.className}
          data-stylex-owner="projects-directory-owner-avatar"
        >
          <Link
            to="/$ownerName/$projectName"
            params={{ ownerName, projectName }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
          >
            {logoUrl ? (
              <img
                {...directoryOwnerAvatarImageStyleProps}
                src={logoUrl}
                alt={projectName}
                data-stylex-owner="projects-directory-owner-avatar-image"
              />
            ) : null}
          </Link>
        </div>
        <div
          {...directoryReadableIdentityStyleProps}
          data-stylex-owner="projects-directory-readable-identity"
        >
          <div
            {...directoryHeaderStyleProps}
            className={directoryHeaderStyleProps.className}
            data-stylex-owner="projects-directory-header"
          >
            <Link
              {...directoryTitleLinkStyleProps}
              to="/$ownerName/$projectName"
              params={{ ownerName, projectName }}
              className={directoryTitleLinkStyleProps.className}
              data-stylex-owner="projects-directory-title-link"
              activeProps={{
                "aria-current": undefined,
                className: directoryTitleLinkStyleProps.className,
                "data-status": undefined,
              }}
            >
              {projectName}
            </Link>{" "}
            {isForked && originOwnerName && originProjectName ? (
              <span
                {...directoryForkOriginStyleProps}
                data-stylex-owner="projects-directory-fork-origin"
              >
                <Link
                  {...directoryForkOriginLinkStyleProps}
                  activeProps={{
                    "aria-current": undefined,
                    className: directoryForkOriginLinkStyleProps.className,
                    "data-status": undefined,
                  }}
                  className={directoryForkOriginLinkStyleProps.className}
                  data-stylex-owner="projects-directory-fork-origin-link"
                  params={{ ownerName: originOwnerName, projectName: originProjectName }}
                  to="/$ownerName/$projectName"
                >
                  <i
                    {...directoryForkSplitIconStyleProps}
                    data-stylex-owner="projects-directory-fork-split-icon"
                  ></i>{" "}
                  {originOwnerName} / {originProjectName}
                </Link>
              </span>
            ) : null}{" "}
            {stringField(project, "projectScope", "public") === "private" ? (
              <i
                {...directoryPrivateLockStyleProps}
                data-stylex-owner="projects-directory-private-lock"
              ></i>
            ) : null}{" "}
            {labels.map((label) => {
              const className = label.category
                ? `${label.category.toLowerCase()} ${directoryProjectLabelStyleProps.className ?? ""}`
                : directoryProjectLabelStyleProps.className;
              return (
                <Link
                  {...directoryProjectLabelStyleProps}
                  activeOptions={{ exact: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className,
                    "data-status": undefined,
                  }}
                  className={className}
                  data-stylex-owner="projects-directory-project-label"
                  key={label.id}
                  onClick={(event) => {
                    event.preventDefault();
                    router.history.push(
                      prefixBasePath(
                        basePath,
                        `/projects?labelIds=${encodeURIComponent(label.id)}`,
                      ),
                    );
                  }}
                  search={{ labelIds: labelIdSearchValue(label.id) }}
                  to="/projects"
                >
                  {label.name}
                </Link>
              );
            })}
          </div>
          <div
            {...directoryDescriptionStyleProps}
            data-stylex-owner="projects-directory-description"
          >
            {stringField(project, "overview", "")}
          </div>
          <p {...directoryNameTagStyleProps} data-stylex-owner="projects-directory-name-tag">
            {"by "}
            <Link
              {...directoryOwnerLinkStyleProps}
              to="/$user"
              params={{ user: ownerName }}
              search={{ daysAgo: 14, selected: "issues" }}
              className={directoryOwnerLinkStyleProps.className}
              data-stylex-owner="projects-directory-owner-link"
              activeProps={{
                "aria-current": undefined,
                className: directoryOwnerLinkStyleProps.className,
                "data-status": undefined,
              }}
            >
              {ownerName}
            </Link>
            {" at "}
            <strong title={createdTitle}>{createdLabel}</strong>{" "}
            <span
              {...directoryCodeUpdateStyleProps}
              data-stylex-owner="projects-directory-code-update"
            >
              {lastPushedLabel ? (
                <>
                  {`, ${t("project.codeUpdate")} `}
                  <strong>{lastPushedLabel}</strong>
                </>
              ) : null}
            </span>
          </p>
        </div>
      </div>
      {stringField(project, "projectScope", "public") === "public" ? (
        <div {...directoryStatsStyleProps} data-stylex-owner="projects-directory-stats">
          <div {...directoryMembersStyleProps} data-stylex-owner="projects-directory-members">
            <ul
              {...directoryMembersListStyleProps}
              data-stylex-owner="projects-directory-members-list"
            >
              {members.map((member) => {
                const loginId = stringField(member, "loginId", "");
                return (
                  <li
                    {...directoryMemberItemStyleProps}
                    data-stylex-owner="projects-directory-member-item"
                    key={loginId}
                  >
                    <Link
                      {...directoryMemberAvatarStyleProps}
                      activeProps={{
                        "aria-current": undefined,
                        className: directoryMemberAvatarStyleProps.className,
                        "data-status": undefined,
                      }}
                      className={directoryMemberAvatarStyleProps.className}
                      data-stylex-owner="projects-directory-member-avatar"
                      params={{ user: loginId }}
                      to="/$user"
                    >
                      <img
                        {...directoryMemberAvatarImageStyleProps}
                        alt={stringField(member, "userLabel", "")}
                        data-stylex-owner="projects-directory-member-avatar-image"
                        src={stringField(member, "avatarUrl", "")}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p>
              <i
                {...directoryStatsFriendsIconStyleProps}
                data-stylex-owner="projects-directory-stats-icon"
              ></i>
              <strong
                {...directoryMemberCountStyleProps}
                data-stylex-owner="projects-directory-member-count"
              >
                {memberCount}
              </strong>{" "}
              <i
                {...directoryStatsEyeIconStyleProps}
                data-stylex-owner="projects-directory-stats-icon"
              ></i>{" "}
              <strong
                {...directoryMemberCountStyleProps}
                data-stylex-owner="projects-directory-member-count"
              >
                {watchCount}
              </strong>
            </p>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function projectItems(payload: unknown): ProjectDirectoryItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as { items?: unknown; projects?: unknown };
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.projects)
      ? record.projects
      : [];
  return items.filter((item): item is ProjectDirectoryItem =>
    Boolean(item && typeof item === "object"),
  );
}

function projectLabels(project: YoramRecord): ProjectDirectoryLabel[] {
  const labels = project.labels;
  if (!Array.isArray(labels)) {
    return [];
  }
  return labels.flatMap((label) => {
    if (!label || typeof label !== "object") {
      return [];
    }
    const record = label as YoramRecord;
    const id = stringOrNumberField(record, "id");
    const name = stringField(record, "name", "");
    if (!id || !name) {
      return [];
    }
    return [
      {
        category: stringField(record, "category", stringField(record, "categoryName", "")),
        id,
        name,
      },
    ];
  });
}

function projectMembers(project: ProjectDirectoryItem): YoramRecord[] {
  return Array.isArray(project.members)
    ? project.members.filter((member): member is YoramRecord =>
        Boolean(member && typeof member === "object" && stringField(member, "loginId", "")),
      )
    : [];
}

function stringField(record: YoramRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function stringOrNumberField(record: YoramRecord, key: string): string {
  const value = record[key];
  if ((typeof value === "string" || typeof value === "number") && String(value) !== "") {
    return String(value);
  }
  return "";
}

function numberField(record: YoramRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" ? value : fallback;
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^[0-9]+$/u.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function stringSearch(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : "";
  }
  if ((typeof value === "string" || typeof value === "number") && String(value) !== "") {
    return String(value);
  }
  return "";
}

function labelIdSearchValue(value: string): number | string {
  return /^[0-9]+$/u.test(value) ? Number.parseInt(value, 10) : value;
}

function positiveIntegerField(payload: unknown, key: string, fallback: number): number {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return positiveInteger((payload as YoramRecord)[key]) ?? fallback;
}

function clampPageNum(pageNum: number, totalPages: number) {
  return Math.min(Math.max(pageNum, 1), Math.max(totalPages, 1));
}

type ProjectsDirectoryQueryInput = {
  filter: string;
  labelIds: string;
  pageNum?: number;
};

function projectsDirectoryQueryOptions(runtimeConfig: RuntimeConfig, search: ProjectsSearch) {
  const input = projectsDirectoryQueryInput(search);
  return queryOptions({
    queryFn: () => listProjectsDirectoryRest(runtimeConfig, input),
    queryKey: [...apiQueryKeys.project.list(), input] as const,
  });
}

function projectsDirectoryQueryInput(search: ProjectsSearch): ProjectsDirectoryQueryInput {
  const pageNum = positiveInteger(search.pageNum);
  return {
    filter: search.filter,
    labelIds: stringSearch(search.labelIds),
    ...(pageNum ? { pageNum } : {}),
  };
}

function listProjectsDirectoryRest(
  runtimeConfig: RuntimeConfig,
  input: ProjectsDirectoryQueryInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ListProjectsResponse> {
  return restFetch<ListProjectsResponse>(runtimeConfig, projectsDirectoryPath(input), {
    fetchImpl,
    method: "GET",
  });
}

function projectsDirectoryPath(input: ProjectsDirectoryQueryInput): string {
  const params = new URLSearchParams();
  if (input.filter) {
    params.set("filter", input.filter);
  }
  if (input.labelIds) {
    params.set("labelIds", input.labelIds);
  }
  if (input.pageNum) {
    params.set("pageNum", String(input.pageNum));
  }
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}
