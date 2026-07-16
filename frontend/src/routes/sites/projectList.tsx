import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState, type CSSProperties, type MouseEvent, type SyntheticEvent } from "react";
import {
  deleteSiteProjectRest,
  siteProjectsQueryOptions,
  siteUpdateQueryOptions,
  type SiteProject,
  type SiteProjectListResponse,
} from "../../api/site-admin";
import { apiQueryKeys } from "../../api/query-keys";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { globalBreakpoints } from "../../theme.stylex";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteProjectListTheme } from "./-projectList.stylex";

type ProjectListSearch = {
  filter?: string;
  pageNum?: number;
};

const paginationSpriteStyle = {
  "--site-project-list-pagination-sprite": `url(${legacySpriteUrl})`,
} as CSSProperties;

const legacyLinkSuppressionProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

const styles = stylex.create({
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: {
      default: null,
      [globalBreakpoints.mobile]: "10px",
    },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: {
    margin: "0px auto",
  },
  breadcrumbHeading: {
    lineHeight: "30px",
    padding: "10px 10px 5px",
  },
  pageWrapOuter: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: {
      default: null,
      [globalBreakpoints.mobile]: "10px",
    },
    padding: {
      default: "0px 10px",
      [globalBreakpoints.mobile]: "0px",
    },
    width: "100%",
  },
  settingWrap: {
    margin: "0px auto",
  },
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
  settingSidebarColumn: {
    marginLeft: "0px",
    width: "14.893617021276595%",
  },
  settingContentColumn: {
    marginLeft: "2.127659574468085%",
    width: "82.97872340425532%",
  },
  sidebarNav: {
    listStyle: "none",
    margin: "0px",
    padding: "0px",
  },
  sidebarItem: {
    borderLeftColor: siteProjectListTheme.sidebarBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarFirstItem: {
    marginTop: "0px",
  },
  sidebarActiveItem: {
    borderLeftColor: siteProjectListTheme.sidebarActiveBorder,
    fontWeight: "700",
  },
  sidebarLink: {
    backgroundColor: {
      default: "transparent",
      ":hover": siteProjectListTheme.sidebarHoverSurface,
    },
    color: {
      default: siteProjectListTheme.sidebarLinkText,
      ":hover": siteProjectListTheme.sidebarActiveBorder,
      ":focus": siteProjectListTheme.sidebarActiveBorder,
    },
    display: "block",
    padding: "5px 10px",
    textDecoration: {
      default: "none",
      ":hover": "none",
      ":focus": "underline",
    },
  },
  sidebarActiveLink: {
    backgroundColor: {
      ":hover": "transparent",
    },
  },
  titleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteProjectListTheme.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: siteProjectListTheme.titleText,
    lineHeight: "30px",
    float: "left",
  },
  projectSearchForm: {
    margin: "0px",
  },
  projectSearchBar: {
    backgroundColor: siteProjectListTheme.searchSurface,
    borderColor: siteProjectListTheme.searchBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    height: "20px",
    lineHeight: "20px",
    margin: {
      default: "0px",
      [globalBreakpoints.mobile]: "5px 0px",
    },
    padding: "4px 25px 4px 5px",
    position: "relative",
  },
  projectSearchTextbox: {
    borderStyle: "none",
    borderWidth: "0px",
    height: "20px",
    margin: "0px -5px",
    padding: "0px 5px",
    transition: "width 0.15s",
    width: {
      default: "350px",
      [globalBreakpoints.mobile]: "inherit",
    },
  },
  projectSearchButton: {
    backgroundColor: siteProjectListTheme.searchButtonSurface,
    borderWidth: "0px",
    height: "20px",
    outline: "0px none",
    position: "absolute",
    right: "5px",
    top: "5px",
  },
  listHead: {
    backgroundColor: siteProjectListTheme.listHeadSurface,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteProjectListTheme.listBorder,
    marginBottom: "5px",
    padding: "5px 0px",
    lineHeight: "30px",
    width: "100%",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  listHeadColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "2.127659574468085%",
    minHeight: "30px",
    padding: "0px 20px",
  },
  listHeadNameColumn: {
    marginLeft: "0px",
    width: "40.42553191489362%",
  },
  listHeadDescriptionColumn: {
    width: "31.914893617021278%",
  },
  listHeadCreatedColumn: {
    width: "14.893617021276595%",
  },
  listHeadActionColumn: {
    width: "6.382978723404255%",
  },
  projectRow: {
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteProjectListTheme.listBorder,
    lineHeight: "70px",
  },
  projectRowEven: {
    backgroundColor: siteProjectListTheme.rowEvenSurface,
  },
  projectRowAvatar: {
    width: "45px",
    height: "45px",
    marginRight: "10px",
    marginTop: "3px",
    float: "left",
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    backgroundColor: siteProjectListTheme.avatarSurface,
    borderRadius: "3px",
  },
  projectRowAvatarImage: {
    width: "100%",
    verticalAlign: "top",
  },
  projectRowColumn: {
    fontSize: "12px",
    padding: "10px 0px",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
    lineHeight: "20px",
  },
  projectListContainer: {
    listStyle: "none",
  },
  projectListProjectName: {
    fontSize: "14px",
    fontWeight: "bold",
  },
  projectListDeleteAction: {
    backgroundColor: {
      default: siteProjectListTheme.deleteSurface,
      ":hover": siteProjectListTheme.deleteInteractiveSurface,
      ":focus": siteProjectListTheme.deleteInteractiveSurface,
      ":active": siteProjectListTheme.deleteSurface,
    },
    borderColor: {
      default: siteProjectListTheme.deleteBorder,
      ":hover": siteProjectListTheme.deleteBorder,
      ":focus": siteProjectListTheme.deleteBorder,
      ":active": siteProjectListTheme.deleteBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteProjectListTheme.deleteShadow,
    color: {
      default: siteProjectListTheme.deleteText,
      ":hover": siteProjectListTheme.deleteText,
      ":focus": siteProjectListTheme.deleteText,
      ":active": siteProjectListTheme.deleteText,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: {
      default: "0.3em",
      ":first-child": "0px",
    },
    outline: "0px none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: {
      ":hover": "none",
      ":focus": "none",
      ":active": "none",
    },
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: 2,
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
    color: siteProjectListTheme.paginationText,
  },
  paginationIconItem: {
    padding: "0px 5px",
  },
  paginationDelimiter: {
    color: siteProjectListTheme.paginationDelimiter,
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
      default: siteProjectListTheme.paginationInputBorder,
      ":hover": siteProjectListTheme.paginationAccent,
      ":focus": siteProjectListTheme.paginationAccent,
    },
    color: {
      ":hover": siteProjectListTheme.paginationAccent,
      ":focus": siteProjectListTheme.paginationAccent,
    },
    boxShadow: {
      ":hover": siteProjectListTheme.paginationInputInteractiveShadow,
      ":focus": siteProjectListTheme.paginationInputInteractiveShadow,
    },
  },
  paginationLabel: {
    fontSize: "11px",
    color: siteProjectListTheme.paginationAccent,
  },
  paginationOffLabel: {
    color: siteProjectListTheme.paginationText,
  },
  paginationIcon: {
    backgroundImage: "var(--site-project-list-pagination-sprite)",
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
  paginationPrevDisabledIcon: {
    backgroundPosition: "-164px -2px",
  },
  paginationNextIcon: {
    backgroundPosition: "-146px -139px",
    marginLeft: "10px",
  },
  paginationNextDisabledIcon: {
    backgroundPosition: "-23px -13px",
  },
  deleteModal: {
    position: "fixed",
    top: {
      default: "10%",
      [globalBreakpoints.mobile]: "10px",
    },
    left: {
      default: "50%",
      [globalBreakpoints.mobile]: "auto",
    },
    right: {
      default: "auto",
      [globalBreakpoints.mobile]: "10px",
    },
    zIndex: 1050,
    width: {
      default: "560px",
      [globalBreakpoints.mobile]: "auto",
    },
    marginLeft: {
      default: "-280px",
      [globalBreakpoints.mobile]: "0px",
    },
    marginRight: {
      [globalBreakpoints.mobile]: "0px",
    },
    backgroundColor: siteProjectListTheme.modalSurface,
    borderColor: siteProjectListTheme.modalBorder,
    borderRadius: "6px",
    borderStyle: "solid",
    borderWidth: "1px",
    outline: "none",
    boxShadow: siteProjectListTheme.modalShadow,
    backgroundClip: "padding-box",
    opacity: 1,
    transition: "opacity 0.3s linear, top 0.3s ease-out",
  },
  deleteModalHeader: {
    padding: "9px 15px",
    borderBottomColor: siteProjectListTheme.modalHeaderBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
  },
  deleteModalClose: {
    float: "right",
    fontSize: "20px",
    fontWeight: "bold",
    lineHeight: "20px",
    color: siteProjectListTheme.modalCloseText,
    textShadow: siteProjectListTheme.modalCloseTextShadow,
    opacity: {
      default: 0.2,
      ":hover": 0.4,
      ":focus": 0.4,
    },
    padding: {
      default: "0px",
      [globalBreakpoints.mobile]: "10px",
    },
    margin: {
      default: "2px 0px 0px",
      [globalBreakpoints.mobile]: "-10px",
    },
    cursor: "pointer",
    backgroundColor: siteProjectListTheme.modalCloseSurface,
    borderStyle: "none",
    borderWidth: "0px",
    appearance: "none",
  },
  deleteModalBody: {
    position: "relative",
    maxHeight: "400px",
    padding: "15px",
    overflowY: "auto",
  },
  deleteModalFooter: {
    padding: "14px 15px 15px",
    marginBottom: "0px",
    textAlign: "right",
    backgroundColor: siteProjectListTheme.modalFooterSurface,
    borderTopColor: siteProjectListTheme.modalFooterBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    borderRadius: "0px 0px 6px 6px",
    boxShadow: siteProjectListTheme.modalFooterShadow,
  },
  deleteModalAction: {
    textAlign: "center",
    whiteSpace: "nowrap",
    color: {
      default: siteProjectListTheme.modalActionText,
      ":hover": siteProjectListTheme.modalActionInteractiveText,
      ":focus": siteProjectListTheme.modalActionInteractiveText,
      ":active": siteProjectListTheme.modalActionInteractiveText,
    },
    backgroundColor: {
      default: siteProjectListTheme.modalActionSurface,
      ":hover": siteProjectListTheme.modalActionInteractiveSurface,
      ":focus": siteProjectListTheme.modalActionInteractiveSurface,
      ":active": siteProjectListTheme.modalActionInteractiveSurface,
    },
    textShadow: "none",
    borderRadius: "3px",
    display: "inline-block",
    padding: "4px 12px",
    verticalAlign: "middle",
    cursor: "pointer",
    lineHeight: "20px",
    fontSize: "14px",
    transition: "all 0.3s ease",
    outline: "0px none",
    position: "relative",
    marginBottom: "0px",
    marginLeft: {
      default: "0.3em",
      ":first-child": "0px",
    },
    borderColor: {
      default: siteProjectListTheme.modalActionBorder,
      ":hover": siteProjectListTheme.modalActionInteractiveBorder,
      ":focus": siteProjectListTheme.modalActionInteractiveBorder,
      ":active": siteProjectListTheme.modalActionInteractiveBorder,
    },
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteProjectListTheme.modalActionShadow,
    zIndex: 2,
    textDecoration: {
      ":hover": "none",
      ":focus": "none",
      ":active": "none",
    },
  },
  deleteModalConfirmAction: {
    color: {
      default: siteProjectListTheme.modalConfirmText,
      ":hover": siteProjectListTheme.modalConfirmText,
      ":focus": siteProjectListTheme.modalConfirmText,
      ":active": siteProjectListTheme.modalConfirmText,
    },
    backgroundColor: {
      default: siteProjectListTheme.modalConfirmSurface,
      ":hover": siteProjectListTheme.modalConfirmInteractiveSurface,
      ":focus": siteProjectListTheme.modalConfirmInteractiveSurface,
      ":active": siteProjectListTheme.modalConfirmInteractiveSurface,
    },
    borderColor: {
      default: siteProjectListTheme.modalConfirmBorder,
      ":hover": siteProjectListTheme.modalConfirmBorder,
      ":focus": siteProjectListTheme.modalConfirmBorder,
      ":active": siteProjectListTheme.modalConfirmBorder,
    },
  },
  deleteModalBackdrop: {
    position: "fixed",
    inset: "0px",
    zIndex: 1040,
    backgroundColor: siteProjectListTheme.modalBackdropSurface,
    opacity: 0.8,
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const projectSearchFormStyleProps = stylex.props(styles.projectSearchForm);
const projectSearchBarStyleProps = stylex.props(styles.projectSearchBar);
const projectSearchTextboxStyleProps = stylex.props(styles.projectSearchTextbox);
const projectSearchButtonStyleProps = stylex.props(styles.projectSearchButton);
const listHeadStyleProps = stylex.props(styles.listHead);
const listHeadColumnStyleProps = {
  action: stylex.props(styles.listHeadColumn, styles.listHeadActionColumn),
  created: stylex.props(styles.listHeadColumn, styles.listHeadCreatedColumn),
  description: stylex.props(styles.listHeadColumn, styles.listHeadDescriptionColumn),
  name: stylex.props(styles.listHeadColumn, styles.listHeadNameColumn),
};
const projectRowStyleProps = stylex.props(styles.projectRow);
const projectRowEvenStyleProps = stylex.props(styles.projectRow, styles.projectRowEven);
const projectRowAvatarStyleProps = stylex.props(styles.projectRowAvatar);
const projectRowAvatarImageStyleProps = stylex.props(styles.projectRowAvatarImage);
const projectRowColumnStyleProps = stylex.props(styles.projectRowColumn);
const projectListContainerStyleProps = stylex.props(styles.projectListContainer);
const projectListProjectNameStyleProps = stylex.props(styles.projectListProjectName);
const projectListDeleteActionStyleProps = stylex.props(styles.projectListDeleteAction);
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
  styles.paginationPrevDisabledIcon,
);
const paginationNextIconStyleProps = stylex.props(styles.paginationIcon, styles.paginationNextIcon);
const paginationNextDisabledIconStyleProps = stylex.props(
  styles.paginationIcon,
  styles.paginationNextIcon,
  styles.paginationNextDisabledIcon,
);
const sidebarNavStyleProps = stylex.props(styles.sidebarNav);
const sidebarItemStyleProps = stylex.props(styles.sidebarItem);
const sidebarFirstItemStyleProps = stylex.props(styles.sidebarItem, styles.sidebarFirstItem);
const sidebarActiveItemStyleProps = stylex.props(styles.sidebarItem, styles.sidebarActiveItem);
const sidebarLinkStyleProps = stylex.props(styles.sidebarLink);
const sidebarActiveLinkStyleProps = stylex.props(styles.sidebarLink, styles.sidebarActiveLink);
const breadcrumbOuterStyleProps = stylex.props(styles.breadcrumbOuter);
const breadcrumbInnerStyleProps = stylex.props(styles.breadcrumbInner);
const breadcrumbHeadingStyleProps = stylex.props(styles.breadcrumbHeading);
const pageWrapOuterStyleProps = stylex.props(styles.pageWrapOuter);
const settingWrapStyleProps = stylex.props(styles.settingWrap);
const settingGridStyleProps = stylex.props(styles.settingGrid);
const settingSidebarColumnStyleProps = stylex.props(
  styles.settingColumn,
  styles.settingSidebarColumn,
);
const settingContentColumnStyleProps = stylex.props(
  styles.settingColumn,
  styles.settingContentColumn,
);
const deleteModalStyleProps = stylex.props(styles.deleteModal);
const deleteModalHeaderStyleProps = stylex.props(styles.deleteModalHeader);
const deleteModalCloseStyleProps = stylex.props(styles.deleteModalClose);
const deleteModalBodyStyleProps = stylex.props(styles.deleteModalBody);
const deleteModalFooterStyleProps = stylex.props(styles.deleteModalFooter);
const deleteModalConfirmActionStyleProps = stylex.props(
  styles.deleteModalAction,
  styles.deleteModalConfirmAction,
);
const deleteModalCancelActionStyleProps = stylex.props(styles.deleteModalAction);
const deleteModalBackdropStyleProps = stylex.props(styles.deleteModalBackdrop);

function insulateProjectDeleteModalClick(event: SyntheticEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export const Route = createFileRoute("/sites/projectList")({
  component: SiteProjectListRoute,
  validateSearch: (search: Record<string, unknown>): ProjectListSearch => ({
    filter:
      typeof search.filter === "string" && search.filter.length > 0 ? search.filter : undefined,
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : undefined,
  }),
});

function SiteProjectListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteProjectListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteProjectListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const routeSearch = Route.useSearch();
  const filter = routeSearch.filter ?? "";
  const pageNum = routeSearch.pageNum;
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteProject, setDeleteProject] = useState<SiteProject | null>(null);
  const [deleteModalClosed, setDeleteModalClosed] = useState(false);
  const currentPage = pageNum ?? 1;
  const projectsQuery = siteProjectsQueryOptions(runtimeConfig, { filter, page: currentPage });
  const query = useQuery(projectsQuery);
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));
  const closeDeletionModal = () => {
    setDeleteModalClosed(true);
    setDeleteProject(null);
  };
  const openDeleteModal = (selectedProject: SiteProject, event: MouseEvent<HTMLButtonElement>) => {
    insulateProjectDeleteModalClick(event);
    setDeleteModalClosed(false);
    setDeleteProject(selectedProject);
  };
  const dismissDeleteModal = (event: SyntheticEvent<HTMLElement>) => {
    insulateProjectDeleteModalClick(event);
    closeDeletionModal();
  };
  const confirmDeleteProject = (event: MouseEvent<HTMLButtonElement>) => {
    insulateProjectDeleteModalClick(event);
    if (deleteProject) {
      deleteMutation.mutate(deleteProject.id);
    }
  };
  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteSiteProjectRest(runtimeConfig, csrfToken, projectId);
    },
    onSuccess(_response, deletedProjectId) {
      let navigateToPreviousPage = false;

      queryClient.setQueryData<SiteProjectListResponse>(projectsQuery.queryKey, (current) => {
        if (!current) {
          return current;
        }

        const nextProjects = current.projects.filter((project) => project.id !== deletedProjectId);
        if (nextProjects.length === current.projects.length) {
          return current;
        }

        const nextTotal = Math.max(0, current.total - 1);
        const nextTotalPages = nextTotal === 0 ? 0 : Math.ceil(nextTotal / current.pageSize);
        navigateToPreviousPage =
          nextProjects.length === 0 && current.page > 1 && nextTotalPages > 0;

        return {
          ...current,
          page: navigateToPreviousPage ? current.page - 1 : current.page,
          projects: nextProjects,
          total: nextTotal,
          totalPages: nextTotalPages,
        };
      });

      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.projectsBase() });
      closeDeletionModal();

      if (navigateToPreviousPage) {
        void router.navigate({
          search: { filter: filter || undefined, pageNum: currentPage - 1 },
          to: "/sites/projectList",
        });
      }
    },
  });

  return (
    <>
      <title>{t("title.projectList")}</title>
      <div {...breadcrumbOuterStyleProps} data-stylex-owner="site-project-list-breadcrumb-outer">
        <div {...breadcrumbInnerStyleProps} data-stylex-owner="site-project-list-breadcrumb-inner">
          <h3
            {...breadcrumbHeadingStyleProps}
            data-stylex-owner="site-project-list-breadcrumb-heading"
          >
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div {...pageWrapOuterStyleProps} data-stylex-owner="site-project-list-page-wrap-outer">
        <div
          {...settingWrapStyleProps}
          className={`site-setting-wrap ${settingWrapStyleProps.className ?? ""}`}
          data-stylex-owner="site-project-list-setting-wrap"
        >
          <div {...settingGridStyleProps} data-stylex-owner="site-project-list-setting-grid">
            <div
              {...settingSidebarColumnStyleProps}
              data-stylex-owner="site-project-list-setting-sidebar-column"
            >
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div
              {...settingContentColumnStyleProps}
              data-stylex-owner="site-project-list-setting-content-column"
            >
              <div {...titleAreaStyleProps} data-stylex-owner="site-project-list-title-strip">
                <h2 {...titleStyleProps} data-stylex-owner="site-project-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.projectList" />
                </h2>
                <form
                  {...projectSearchFormStyleProps}
                  className={`pull-right ${projectSearchFormStyleProps.className ?? ""}`}
                  data-stylex-owner="site-project-list-search"
                  action={prefixBasePath(runtimeConfig.basePath, "/sites/projectList")}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const nextFilter = String(form.get("filter") ?? "");
                    void queryClient.invalidateQueries({
                      queryKey: apiQueryKeys.siteAdmin.projectsBase(),
                    });
                    void router.navigate({
                      search: { filter: nextFilter || undefined, pageNum: undefined },
                      to: "/sites/projectList",
                    });
                  }}
                >
                  <div
                    {...projectSearchBarStyleProps}
                    className={projectSearchBarStyleProps.className}
                    data-stylex-owner="site-project-list-search-bar"
                  >
                    <input
                      {...projectSearchTextboxStyleProps}
                      type="text"
                      className={projectSearchTextboxStyleProps.className}
                      data-stylex-owner="site-project-list-search-textbox"
                      key={filter}
                      name="filter"
                      placeholder={t("site.project.filter")}
                      defaultValue={filter}
                    />
                    <button
                      {...projectSearchButtonStyleProps}
                      type="submit"
                      className={projectSearchButtonStyleProps.className}
                      data-stylex-owner="site-project-list-search-button"
                    >
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </form>
              </div>
              <div
                {...listHeadStyleProps}
                className={listHeadStyleProps.className}
                data-stylex-owner="site-project-list-listhead"
              >
                <div
                  {...listHeadColumnStyleProps.name}
                  className={listHeadColumnStyleProps.name.className}
                  data-stylex-owner="site-project-list-listhead-name-column"
                >
                  <strong>
                    <LegacyMessage messageKey="project.name" />
                  </strong>
                </div>
                <div
                  {...listHeadColumnStyleProps.description}
                  className={listHeadColumnStyleProps.description.className}
                  data-stylex-owner="site-project-list-listhead-description-column"
                >
                  <strong>
                    <LegacyMessage messageKey="project.description" />
                  </strong>
                </div>
                <div
                  {...listHeadColumnStyleProps.created}
                  className={listHeadColumnStyleProps.created.className}
                  data-stylex-owner="site-project-list-listhead-created-column"
                >
                  <strong>
                    <LegacyMessage messageKey="project.created" />
                  </strong>
                </div>
                <div
                  {...listHeadColumnStyleProps.action}
                  className={listHeadColumnStyleProps.action.className}
                  data-stylex-owner="site-project-list-listhead-action-column"
                >
                  <strong>&nbsp;</strong>
                </div>
              </div>
              <ul
                {...projectListContainerStyleProps}
                className={projectListContainerStyleProps.className}
                data-stylex-owner="site-project-list-container"
              >
                {(query.data?.projects ?? []).map((project, index) => (
                  <ProjectListItem
                    index={index}
                    key={project.id}
                    onDelete={openDeleteModal}
                    project={project}
                  />
                ))}
              </ul>

              <ProjectListPagination
                currentPage={query.data?.page ?? currentPage}
                filter={filter}
                totalPages={query.data?.totalPages ?? 0}
              />

              <div
                {...deleteModalStyleProps}
                id="alertDeletionWrap"
                className={deleteModalStyleProps.className}
                data-stylex-owner="site-project-list-delete-modal"
                style={{ display: deleteProject ? "block" : "none" }}
                aria-hidden={deleteProject ? "false" : deleteModalClosed ? "true" : undefined}
              >
                <div
                  {...deleteModalHeaderStyleProps}
                  className={deleteModalHeaderStyleProps.className}
                  data-stylex-owner="site-project-list-delete-modal-header"
                >
                  <button
                    {...deleteModalCloseStyleProps}
                    type="button"
                    className={deleteModalCloseStyleProps.className}
                    data-stylex-owner="site-project-list-delete-modal-close"
                    onClick={dismissDeleteModal}
                  >
                    ×
                  </button>
                  <span id="project-name">
                    {deleteProject ? `${deleteProject.ownerName}/${deleteProject.projectName}` : ""}
                  </span>
                  <LegacyMessage messageKey="site.project.delete" />
                </div>
                <div
                  {...deleteModalBodyStyleProps}
                  className={deleteModalBodyStyleProps.className}
                  data-stylex-owner="site-project-list-delete-modal-body"
                >
                  <p>
                    <LegacyMessage messageKey="site.project.deleteConfirm" />
                  </p>
                </div>
                <div
                  {...deleteModalFooterStyleProps}
                  className={deleteModalFooterStyleProps.className}
                  data-stylex-owner="site-project-list-delete-modal-footer"
                >
                  <button
                    {...deleteModalConfirmActionStyleProps}
                    type="button"
                    id="projectDeleteBtn"
                    className={deleteModalConfirmActionStyleProps.className}
                    data-stylex-owner="site-project-list-delete-modal-confirm-action"
                    onClick={confirmDeleteProject}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button
                    {...deleteModalCancelActionStyleProps}
                    type="button"
                    className={deleteModalCancelActionStyleProps.className}
                    data-stylex-owner="site-project-list-delete-modal-cancel-action"
                    onClick={dismissDeleteModal}
                  >
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
              {deleteProject ? (
                <div
                  {...deleteModalBackdropStyleProps}
                  className={deleteModalBackdropStyleProps.className}
                  data-stylex-owner="site-project-list-delete-modal-backdrop"
                  onClick={dismissDeleteModal}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") dismissDeleteModal(event);
                  }}
                  role="button"
                  tabIndex={-1}
                ></div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ProjectListPagination({
  currentPage,
  filter,
  totalPages,
}: {
  currentPage: number;
  filter: string;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const search = (pageNum: number) => ({
    filter: filter || undefined,
    pageNum,
  });

  return (
    <div
      {...paginationWrapperStyleProps}
      className={paginationWrapperStyleProps.className}
      data-stylex-owner="site-project-list-pagination"
      id="pagination"
    >
      <ul
        {...paginationListStyleProps}
        className={paginationListStyleProps.className}
        data-stylex-owner="site-project-list-pagination-list"
      >
        <li
          {...paginationIconItemStyleProps}
          className={paginationIconItemStyleProps.className}
          data-pagination-variant="icon"
          data-stylex-owner="site-project-list-pagination-item"
        >
          {hasPrev ? (
            <Link
              {...legacyLinkSuppressionProps}
              search={search(currentPage - 1)}
              to="/sites/projectList"
            >
              <i
                {...paginationPrevIconStyleProps}
                data-disabled="false"
                data-stylex-owner="site-project-list-pagination-icon"
                style={paginationSpriteStyle}
              ></i>
              <span
                {...paginationLabelStyleProps}
                className={paginationLabelStyleProps.className}
                data-stylex-owner="site-project-list-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </Link>
          ) : (
            <>
              <i
                {...paginationPrevDisabledIconStyleProps}
                data-disabled="true"
                data-pagination-state="off"
                data-stylex-owner="site-project-list-pagination-icon"
                style={paginationSpriteStyle}
              ></i>
              <span
                {...paginationOffLabelStyleProps}
                className={paginationOffLabelStyleProps.className}
                data-pagination-state="off"
                data-stylex-owner="site-project-list-pagination-label"
              >
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li
          {...paginationItemStyleProps}
          className={paginationItemStyleProps.className}
          data-stylex-owner="site-project-list-pagination-item"
        >
          <input
            {...paginationInputStyleProps}
            data-stylex-owner="site-project-list-pagination-input"
            key={`${currentPage}-${totalPages}`}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              if (!/^[0-9]+$/.test(event.currentTarget.value)) {
                event.currentTarget.value = String(currentPage);
                return;
              }

              const pageNum = Number(event.currentTarget.value);
              const nextPage = Math.min(Math.max(pageNum, 1), totalPages);
              event.currentTarget.value = String(nextPage);
              void router.navigate({
                search: search(nextPage),
                to: "/sites/projectList",
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
          data-stylex-owner="site-project-list-pagination-item"
        >
          /
        </li>
        <li
          {...paginationItemStyleProps}
          className={paginationItemStyleProps.className}
          data-stylex-owner="site-project-list-pagination-item"
        >
          {totalPages}
        </li>
        <li
          {...paginationIconItemStyleProps}
          className={paginationIconItemStyleProps.className}
          data-pagination-variant="icon"
          data-stylex-owner="site-project-list-pagination-item"
        >
          {hasNext ? (
            <Link
              {...legacyLinkSuppressionProps}
              search={search(currentPage + 1)}
              to="/sites/projectList"
            >
              <span
                {...paginationLabelStyleProps}
                className={paginationLabelStyleProps.className}
                data-stylex-owner="site-project-list-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...paginationNextIconStyleProps}
                data-disabled="false"
                data-stylex-owner="site-project-list-pagination-icon"
                style={paginationSpriteStyle}
              ></i>
            </Link>
          ) : (
            <>
              <span
                {...paginationOffLabelStyleProps}
                className={paginationOffLabelStyleProps.className}
                data-pagination-state="off"
                data-stylex-owner="site-project-list-pagination-label"
              >
                {t("button.nextPage")}
              </span>
              <i
                {...paginationNextDisabledIconStyleProps}
                data-disabled="true"
                data-pagination-state="off"
                data-stylex-owner="site-project-list-pagination-icon"
                style={paginationSpriteStyle}
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
    <ul {...sidebarNavStyleProps} data-stylex-owner="site-project-list-sidebar-nav">
      <li
        {...sidebarFirstItemStyleProps}
        data-selected="false"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/userList"
        >
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li
        {...sidebarItemStyleProps}
        data-selected="false"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li
        {...sidebarItemStyleProps}
        data-selected="false"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li
        {...sidebarActiveItemStyleProps}
        data-selected="true"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarActiveLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/projectList"
        >
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li
        {...sidebarItemStyleProps}
        data-selected="false"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/mail"
        >
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li
        {...sidebarItemStyleProps}
        data-selected="false"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li
        {...sidebarItemStyleProps}
        data-selected="false"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/update"
        >
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li
        {...sidebarItemStyleProps}
        data-selected="false"
        data-stylex-owner="site-project-list-sidebar-item"
      >
        <Link
          {...legacyLinkSuppressionProps}
          {...sidebarLinkStyleProps}
          data-stylex-owner="site-project-list-sidebar-link"
          to="/sites/diagnostic"
        >
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function ProjectListItem({
  index,
  onDelete,
  project,
}: {
  index: number;
  onDelete: (project: SiteProject, event: MouseEvent<HTMLButtonElement>) => void;
  project: SiteProject;
}) {
  const projectLogoUrl = project.projectLogoUrl.trim() || "/assets/images/project_default_logo.png";
  const rowStyleProps = index % 2 === 1 ? projectRowEvenStyleProps : projectRowStyleProps;

  return (
    <li
      {...rowStyleProps}
      className={`row-fluid ${rowStyleProps.className ?? ""}`}
      data-stylex-owner="site-project-list-row"
    >
      <div
        {...projectRowColumnStyleProps}
        className={`span5 listitem-col ${projectRowColumnStyleProps.className ?? ""}`}
        data-stylex-owner="site-project-list-row-columns"
      >
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: project.ownerName, projectName: project.projectName }}
          {...projectRowAvatarStyleProps}
          className={projectRowAvatarStyleProps.className}
          data-stylex-owner="site-project-list-row-avatar"
        >
          <img
            {...projectRowAvatarImageStyleProps}
            src={projectLogoUrl}
            alt={project.projectName}
            className={projectRowAvatarImageStyleProps.className}
            data-stylex-owner="site-project-list-row-avatar-image"
          />{" "}
          {project.ownerName}/{project.projectName}
        </Link>
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: project.ownerName, projectName: project.projectName }}
          {...projectListProjectNameStyleProps}
          className={projectListProjectNameStyleProps.className}
          data-stylex-owner="site-project-list-project-name"
        >
          {project.ownerName}/{project.projectName}
        </Link>
      </div>
      <div
        {...projectRowColumnStyleProps}
        className={`span4 listitem-col ${projectRowColumnStyleProps.className ?? ""}`}
        data-stylex-owner="site-project-list-row-columns"
      >
        {project.overview}
      </div>
      <div
        {...projectRowColumnStyleProps}
        className={`span2 listitem-col ${projectRowColumnStyleProps.className ?? ""}`}
        data-stylex-owner="site-project-list-row-columns"
      >
        {project.createdAt}
      </div>
      <div
        {...projectRowColumnStyleProps}
        className={`span1 listitem-col ${projectRowColumnStyleProps.className ?? ""}`}
        data-stylex-owner="site-project-list-row-columns"
      >
        <button
          {...projectListDeleteActionStyleProps}
          className={projectListDeleteActionStyleProps.className}
          data-stylex-owner="site-project-list-delete-action"
          data-project-name={`${project.ownerName}/${project.projectName}`}
          onClick={(event) => onDelete(project, event)}
        >
          <LegacyMessage messageKey="button.delete" />
        </button>
      </div>
    </li>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
