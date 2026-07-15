import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState, type MouseEvent, type SyntheticEvent } from "react";
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
import { globalBreakpoints, globalColors } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";

type ProjectListSearch = {
  filter?: string;
  pageNum?: number;
};

const legacyLinkSuppressionProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
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
  projectSearchForm: {
    margin: globalColors.siteProjectListSearchFormMargin,
  },
  projectSearchBar: {
    backgroundColor: globalColors.siteProjectListSearchBarSurface,
    borderColor: globalColors.siteProjectListSearchBarBorder,
    borderRadius: globalColors.siteProjectListSearchBarRadius,
    borderStyle: globalColors.siteProjectListSearchBarBorderStyle,
    borderWidth: globalColors.siteProjectListSearchBarBorderWidth,
    height: globalColors.siteProjectListSearchBarHeight,
    lineHeight: globalColors.siteProjectListSearchBarLineHeight,
    margin: {
      default: globalColors.siteProjectListSearchBarMargin,
      [globalBreakpoints.mobile]: globalColors.siteProjectListSearchBarMobileMargin,
    },
    padding: globalColors.siteProjectListSearchBarPadding,
    position: globalColors.siteProjectListSearchBarPosition,
  },
  projectSearchTextbox: {
    borderStyle: globalColors.siteProjectListSearchTextboxBorderStyle,
    borderWidth: globalColors.siteProjectListSearchTextboxBorderWidth,
    height: globalColors.siteProjectListSearchTextboxHeight,
    margin: globalColors.siteProjectListSearchTextboxMargin,
    padding: globalColors.siteProjectListSearchTextboxPadding,
    transition: globalColors.siteProjectListSearchTextboxTransition,
    width: {
      default: globalColors.siteProjectListSearchTextboxWidth,
      [globalBreakpoints.mobile]: globalColors.siteProjectListSearchTextboxMobileWidth,
    },
  },
  projectSearchButton: {
    backgroundColor: globalColors.siteProjectListSearchButtonSurface,
    borderWidth: globalColors.siteProjectListSearchButtonBorderWidth,
    height: globalColors.siteProjectListSearchButtonHeight,
    outline: globalColors.siteProjectListSearchButtonOutline,
    position: globalColors.siteProjectListSearchButtonPosition,
    right: globalColors.siteProjectListSearchButtonRight,
    top: globalColors.siteProjectListSearchButtonTop,
  },
  listHead: {
    backgroundColor: globalColors.siteProjectListHeadSurface,
    borderBottomStyle: globalColors.siteProjectListHeadBorderStyle,
    borderBottomWidth: globalColors.siteProjectListHeadBorderBottomWidth,
    borderBottomColor: globalColors.siteProjectListHeadBorder,
    marginBottom: globalColors.siteProjectListHeadMarginBottom,
    padding: globalColors.siteProjectListHeadPadding,
    lineHeight: globalColors.siteProjectListHeadLineHeight,
  },
  listHeadTitle: {
    padding: globalColors.siteProjectListHeadColumnPadding,
  },
  projectRow: {
    borderBottomStyle: globalColors.siteProjectListRowBorderStyle,
    borderBottomWidth: globalColors.siteProjectListRowBorderBottomWidth,
    borderBottomColor: globalColors.siteProjectListRowBorder,
    lineHeight: globalColors.siteProjectListRowLineHeight,
  },
  projectRowEven: {
    backgroundColor: globalColors.siteProjectListRowEvenSurface,
  },
  projectRowAvatar: {
    width: globalColors.siteProjectListRowAvatarWidth,
    height: globalColors.siteProjectListRowAvatarHeight,
    marginRight: globalColors.siteProjectListRowAvatarMarginRight,
    marginTop: globalColors.siteProjectListRowAvatarMarginTop,
    float: globalColors.siteProjectListRowAvatarFloat,
    display: globalColors.siteProjectListRowAvatarDisplay,
    verticalAlign: globalColors.siteProjectListRowAvatarVerticalAlign,
    overflow: globalColors.siteProjectListRowAvatarOverflow,
    backgroundColor: globalColors.siteProjectListRowAvatarSurface,
    borderRadius: globalColors.siteProjectListRowAvatarBorderRadius,
  },
  projectRowAvatarImage: {
    width: globalColors.siteProjectListRowAvatarImageWidth,
    verticalAlign: globalColors.siteProjectListRowAvatarImageVerticalAlign,
  },
  projectRowColumn: {
    fontSize: globalColors.siteProjectListRowColumnFontSize,
    padding: globalColors.siteProjectListRowColumnPadding,
    textOverflow: globalColors.siteProjectListRowColumnTextOverflow,
    wordBreak: globalColors.siteProjectListRowColumnWordBreak,
    lineHeight: globalColors.siteProjectListRowColumnLineHeight,
  },
  projectListContainer: {
    listStyle: globalColors.siteProjectListContainerListStyle,
  },
  projectListProjectName: {
    fontSize: globalColors.siteProjectListProjectNameFontSize,
    fontWeight: globalColors.siteProjectListProjectNameFontWeight,
  },
  projectListDeleteAction: {
    backgroundColor: {
      default: globalColors.siteProjectListDeleteSurface,
      ":hover": globalColors.siteProjectListDeleteHoverSurface,
      ":focus": globalColors.siteProjectListDeleteHoverSurface,
      ":active": globalColors.siteProjectListDeleteSurface,
    },
    borderColor: {
      default: globalColors.siteProjectListDeleteBorder,
      ":hover": globalColors.siteProjectListDeleteBorder,
      ":focus": globalColors.siteProjectListDeleteBorder,
      ":active": globalColors.siteProjectListDeleteBorder,
    },
    borderRadius: globalColors.siteProjectListDeleteBorderRadius,
    borderStyle: globalColors.siteProjectListDeleteBorderStyle,
    borderWidth: globalColors.siteProjectListDeleteBorderWidth,
    boxShadow: globalColors.siteProjectListDeleteBoxShadow,
    color: {
      default: globalColors.siteProjectListDeleteText,
      ":hover": globalColors.siteProjectListDeleteText,
      ":focus": globalColors.siteProjectListDeleteText,
      ":active": globalColors.siteProjectListDeleteActiveText,
    },
    cursor: globalColors.siteProjectListDeleteCursor,
    display: globalColors.siteProjectListDeleteDisplay,
    fontSize: globalColors.siteProjectListDeleteFontSize,
    lineHeight: globalColors.siteProjectListDeleteLineHeight,
    marginBottom: globalColors.siteProjectListDeleteMarginBottom,
    marginLeft: {
      default: globalColors.siteProjectListDeleteMarginLeft,
      ":first-child": globalColors.siteProjectListDeleteFirstChildMarginLeft,
    },
    outline: globalColors.siteProjectListDeleteOutline,
    padding: globalColors.siteProjectListDeletePadding,
    position: globalColors.siteProjectListDeletePosition,
    textAlign: globalColors.siteProjectListDeleteTextAlign,
    textDecoration: {
      ":hover": globalColors.siteProjectListDeleteInteractiveTextDecoration,
      ":focus": globalColors.siteProjectListDeleteInteractiveTextDecoration,
      ":active": globalColors.siteProjectListDeleteInteractiveTextDecoration,
    },
    textShadow: globalColors.siteProjectListDeleteTextShadow,
    transition: globalColors.siteProjectListDeleteTransition,
    verticalAlign: globalColors.siteProjectListDeleteVerticalAlign,
    whiteSpace: globalColors.siteProjectListDeleteWhiteSpace,
    zIndex: globalColors.siteProjectListDeleteZIndex,
  },
  paginationWrapper: {
    width: globalColors.siteProjectListPaginationWrapperWidth,
    textAlign: globalColors.siteProjectListPaginationWrapperTextAlign,
    margin: globalColors.siteProjectListPaginationWrapperMargin,
    clear: globalColors.siteProjectListPaginationWrapperClear,
  },
  paginationList: {
    margin: globalColors.siteProjectListPaginationListMargin,
    marginLeft: {
      default: globalColors.siteProjectListPaginationListDesktopMarginLeft,
      [globalBreakpoints.mobile]: globalColors.siteProjectListPaginationListMobileMarginLeft,
    },
    padding: globalColors.siteProjectListPaginationListPadding,
    listStyle: globalColors.siteProjectListPaginationListStyle,
    fontSize: globalColors.siteProjectListPaginationListFontSize,
    display: globalColors.siteProjectListPaginationListDisplay,
  },
  paginationItem: {
    display: globalColors.siteProjectListPaginationItemDisplay,
    padding: globalColors.siteProjectListPaginationItemPadding,
    fontSize: globalColors.siteProjectListPaginationItemFontSize,
    color: globalColors.siteProjectListPaginationItemText,
  },
  paginationIconItem: {
    padding: globalColors.siteProjectListPaginationIconItemPadding,
  },
  paginationDelimiter: {
    color: globalColors.siteProjectListPaginationDelimiterText,
    padding: globalColors.siteProjectListPaginationDelimiterPadding,
  },
  paginationInput: {
    margin: globalColors.siteProjectListPaginationInputMargin,
    width: globalColors.siteProjectListPaginationInputWidth,
    textAlign: globalColors.siteProjectListPaginationInputTextAlign,
    fontWeight: globalColors.siteProjectListPaginationInputFontWeight,
    borderWidth: globalColors.siteProjectListPaginationInputBorderWidth,
    borderStyle: globalColors.siteProjectListPaginationInputBorderStyle,
    borderColor: {
      default: globalColors.siteProjectListPaginationInputBorder,
      ":hover": globalColors.siteProjectListPaginationInputInteractiveBorder,
      ":focus": globalColors.siteProjectListPaginationInputInteractiveBorder,
    },
    color: {
      ":hover": globalColors.siteProjectListPaginationInputInteractiveText,
      ":focus": globalColors.siteProjectListPaginationInputInteractiveText,
    },
    boxShadow: {
      ":hover": globalColors.siteProjectListPaginationInputInteractiveShadow,
      ":focus": globalColors.siteProjectListPaginationInputInteractiveShadow,
    },
  },
  paginationLabel: {
    fontSize: globalColors.siteProjectListPaginationLabelFontSize,
    color: globalColors.siteProjectListPaginationLabelText,
  },
  paginationOffLabel: {
    color: globalColors.siteProjectListPaginationOffLabelText,
  },
  paginationIcon: {
    display: globalColors.siteProjectListPaginationIconDisplay,
    verticalAlign: globalColors.siteProjectListPaginationIconVerticalAlign,
    width: globalColors.siteProjectListPaginationIconWidth,
    height: globalColors.siteProjectListPaginationIconHeight,
  },
  paginationPrevIcon: {
    marginRight: globalColors.siteProjectListPaginationPrevIconMarginRight,
  },
  paginationNextIcon: {
    marginLeft: globalColors.siteProjectListPaginationNextIconMarginLeft,
  },
  deleteModal: {
    position: globalColors.siteProjectListModalPosition,
    top: {
      default: globalColors.siteProjectListModalDesktopTop,
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalMobileTop,
    },
    left: {
      default: globalColors.siteProjectListModalDesktopLeft,
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalMobileLeft,
    },
    right: {
      default: globalColors.siteProjectListModalDesktopRight,
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalMobileRight,
    },
    zIndex: globalColors.siteProjectListModalZIndex,
    width: {
      default: globalColors.siteProjectListModalDesktopWidth,
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalMobileWidth,
    },
    marginLeft: {
      default: globalColors.siteProjectListModalDesktopMarginLeft,
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalMobileMarginLeft,
    },
    marginRight: {
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalMobileMarginRight,
    },
    backgroundColor: globalColors.siteProjectListModalSurface,
    borderColor: globalColors.siteProjectListModalBorder,
    borderRadius: globalColors.siteProjectListModalBorderRadius,
    borderStyle: globalColors.siteProjectListModalBorderStyle,
    borderWidth: globalColors.siteProjectListModalBorderWidth,
    outline: globalColors.siteProjectListModalOutline,
    boxShadow: globalColors.siteProjectListModalShadow,
    backgroundClip: globalColors.siteProjectListModalBackgroundClip,
    opacity: globalColors.siteProjectListModalOpacity,
    transition: globalColors.siteProjectListModalTransition,
  },
  deleteModalHeader: {
    padding: globalColors.siteProjectListModalHeaderPadding,
    borderBottomColor: globalColors.siteProjectListModalHeaderBorder,
    borderBottomStyle: globalColors.siteProjectListModalHeaderBorderStyle,
    borderBottomWidth: globalColors.siteProjectListModalHeaderBorderWidth,
  },
  deleteModalClose: {
    float: globalColors.siteProjectListModalCloseFloat,
    fontSize: globalColors.siteProjectListModalCloseFontSize,
    fontWeight: globalColors.siteProjectListModalCloseFontWeight,
    lineHeight: globalColors.siteProjectListModalCloseLineHeight,
    color: globalColors.siteProjectListModalCloseText,
    textShadow: globalColors.siteProjectListModalCloseTextShadow,
    opacity: {
      default: globalColors.siteProjectListModalCloseOpacity,
      ":hover": globalColors.siteProjectListModalCloseHoverOpacity,
      ":focus": globalColors.siteProjectListModalCloseHoverOpacity,
    },
    padding: {
      default: globalColors.siteProjectListModalCloseDesktopPadding,
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalCloseMobilePadding,
    },
    margin: {
      default: globalColors.siteProjectListModalCloseDesktopMargin,
      [globalBreakpoints.mobile]: globalColors.siteProjectListModalCloseMobileMargin,
    },
    cursor: globalColors.siteProjectListModalCloseCursor,
    backgroundColor: globalColors.siteProjectListModalCloseSurface,
    borderStyle: globalColors.siteProjectListModalCloseBorderStyle,
    borderWidth: globalColors.siteProjectListModalCloseBorderWidth,
    appearance: globalColors.siteProjectListModalCloseAppearance,
  },
  deleteModalBody: {
    position: globalColors.siteProjectListModalBodyPosition,
    maxHeight: globalColors.siteProjectListModalBodyMaxHeight,
    padding: globalColors.siteProjectListModalBodyPadding,
    overflowY: globalColors.siteProjectListModalBodyOverflowY,
  },
  deleteModalFooter: {
    padding: globalColors.siteProjectListModalFooterPadding,
    marginBottom: globalColors.siteProjectListModalFooterMarginBottom,
    textAlign: globalColors.siteProjectListModalFooterTextAlign,
    backgroundColor: globalColors.siteProjectListModalFooterSurface,
    borderTopColor: globalColors.siteProjectListModalFooterBorder,
    borderTopStyle: globalColors.siteProjectListModalFooterBorderStyle,
    borderTopWidth: globalColors.siteProjectListModalFooterBorderWidth,
    borderRadius: globalColors.siteProjectListModalFooterRadius,
    boxShadow: globalColors.siteProjectListModalFooterShadow,
  },
  deleteModalAction: {
    textAlign: globalColors.siteProjectListModalActionTextAlign,
    whiteSpace: globalColors.siteProjectListModalActionWhiteSpace,
    color: {
      default: globalColors.siteProjectListModalActionText,
      ":hover": globalColors.siteProjectListModalActionInteractiveText,
      ":focus": globalColors.siteProjectListModalActionInteractiveText,
      ":active": globalColors.siteProjectListModalActionInteractiveText,
    },
    backgroundColor: {
      default: globalColors.siteProjectListModalActionSurface,
      ":hover": globalColors.siteProjectListModalActionInteractiveSurface,
      ":focus": globalColors.siteProjectListModalActionInteractiveSurface,
      ":active": globalColors.siteProjectListModalActionInteractiveSurface,
    },
    textShadow: globalColors.siteProjectListModalActionTextShadow,
    borderRadius: globalColors.siteProjectListModalActionBorderRadius,
    display: globalColors.siteProjectListModalActionDisplay,
    padding: globalColors.siteProjectListModalActionPadding,
    verticalAlign: globalColors.siteProjectListModalActionVerticalAlign,
    cursor: globalColors.siteProjectListModalActionCursor,
    lineHeight: globalColors.siteProjectListModalActionLineHeight,
    fontSize: globalColors.siteProjectListModalActionFontSize,
    transition: globalColors.siteProjectListModalActionTransition,
    outline: globalColors.siteProjectListModalActionOutline,
    position: globalColors.siteProjectListModalActionPosition,
    marginBottom: globalColors.siteProjectListModalActionMarginBottom,
    marginLeft: {
      default: globalColors.siteProjectListModalActionMarginLeft,
      ":first-child": globalColors.siteProjectListModalActionFirstChildMarginLeft,
    },
    borderColor: {
      default: globalColors.siteProjectListModalActionBorder,
      ":hover": globalColors.siteProjectListModalActionInteractiveBorder,
      ":focus": globalColors.siteProjectListModalActionInteractiveBorder,
      ":active": globalColors.siteProjectListModalActionInteractiveBorder,
    },
    borderStyle: globalColors.siteProjectListModalActionBorderStyle,
    borderWidth: globalColors.siteProjectListModalActionBorderWidth,
    boxShadow: globalColors.siteProjectListModalActionShadow,
    zIndex: globalColors.siteProjectListModalActionZIndex,
    textDecoration: {
      ":hover": globalColors.siteProjectListModalActionInteractiveTextDecoration,
      ":focus": globalColors.siteProjectListModalActionInteractiveTextDecoration,
      ":active": globalColors.siteProjectListModalActionInteractiveTextDecoration,
    },
  },
  deleteModalConfirmAction: {
    color: {
      default: globalColors.siteProjectListModalConfirmText,
      ":hover": globalColors.siteProjectListModalConfirmText,
      ":focus": globalColors.siteProjectListModalConfirmText,
      ":active": globalColors.siteProjectListModalConfirmText,
    },
    backgroundColor: {
      default: globalColors.siteProjectListModalConfirmSurface,
      ":hover": globalColors.siteProjectListModalConfirmInteractiveSurface,
      ":focus": globalColors.siteProjectListModalConfirmInteractiveSurface,
      ":active": globalColors.siteProjectListModalConfirmInteractiveSurface,
    },
    borderColor: {
      default: globalColors.siteProjectListModalConfirmBorder,
      ":hover": globalColors.siteProjectListModalConfirmBorder,
      ":focus": globalColors.siteProjectListModalConfirmBorder,
      ":active": globalColors.siteProjectListModalConfirmBorder,
    },
  },
  deleteModalBackdrop: {
    position: globalColors.siteProjectListModalBackdropPosition,
    inset: globalColors.siteProjectListModalBackdropInset,
    zIndex: globalColors.siteProjectListModalBackdropZIndex,
    backgroundColor: globalColors.siteProjectListModalBackdropSurface,
    opacity: globalColors.siteProjectListModalBackdropOpacity,
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const projectSearchFormStyleProps = stylex.props(styles.projectSearchForm);
const projectSearchBarStyleProps = stylex.props(styles.projectSearchBar);
const projectSearchTextboxStyleProps = stylex.props(styles.projectSearchTextbox);
const projectSearchButtonStyleProps = stylex.props(styles.projectSearchButton);
const listHeadStyleProps = stylex.props(styles.listHead);
const listHeadTitleStyleProps = stylex.props(styles.listHeadTitle);
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
const paginationNextIconStyleProps = stylex.props(styles.paginationIcon, styles.paginationNextIcon);
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
                data-stylex-owner="site-project-list-title-strip"
              >
                <h2 {...titleStyleProps} className={`pull-left ${titleStyleProps.className ?? ""}`}>
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
                className={`row-fluid listhead ${listHeadStyleProps.className ?? ""}`}
                data-stylex-owner="site-project-list-listhead"
              >
                <div
                  {...listHeadTitleStyleProps}
                  className={`span5 listhead-title ${listHeadTitleStyleProps.className ?? ""}`}
                >
                  <strong>
                    <LegacyMessage messageKey="project.name" />
                  </strong>
                </div>
                <div
                  {...listHeadTitleStyleProps}
                  className={`span4 listhead-title ${listHeadTitleStyleProps.className ?? ""}`}
                >
                  <strong>
                    <LegacyMessage messageKey="project.description" />
                  </strong>
                </div>
                <div
                  {...listHeadTitleStyleProps}
                  className={`span2 listhead-title ${listHeadTitleStyleProps.className ?? ""}`}
                >
                  <strong>
                    <LegacyMessage messageKey="project.created" />
                  </strong>
                </div>
                <div
                  {...listHeadTitleStyleProps}
                  className={`span1 listhead-title ${listHeadTitleStyleProps.className ?? ""}`}
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
                className={`ico btn-pg-prev ${paginationPrevIconStyleProps.className ?? ""}`}
                data-stylex-owner="site-project-list-pagination-icon"
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
                {...paginationPrevIconStyleProps}
                className={`ico btn-pg-prev off ${paginationPrevIconStyleProps.className ?? ""}`}
                data-pagination-state="off"
                data-stylex-owner="site-project-list-pagination-icon"
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
            className={`nospinner ${paginationInputStyleProps.className ?? ""}`}
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
                className={`ico btn-pg-next ${paginationNextIconStyleProps.className ?? ""}`}
                data-stylex-owner="site-project-list-pagination-icon"
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
                {...paginationNextIconStyleProps}
                className={`ico btn-pg-next off ${paginationNextIconStyleProps.className ?? ""}`}
                data-pagination-state="off"
                data-stylex-owner="site-project-list-pagination-icon"
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
        <Link {...legacyLinkSuppressionProps} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="active">
        <Link {...legacyLinkSuppressionProps} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link {...legacyLinkSuppressionProps} to="/sites/diagnostic">
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
