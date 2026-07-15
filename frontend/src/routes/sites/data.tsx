import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { siteUpdateQueryOptions } from "../../api/site-admin";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { globalColors } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";

const styles = stylex.create({
  sidebar: {
    margin: globalColors.siteDataSidebarMargin,
    padding: globalColors.siteDataSidebarPadding,
    listStyle: globalColors.siteDataSidebarListStyle,
  },
  sidebarItem: {
    borderLeftColor: globalColors.siteDataSidebarItemBorderLeftColor,
    borderLeftStyle: globalColors.siteDataSidebarItemBorderLeftStyle,
    borderLeftWidth: globalColors.siteDataSidebarItemBorderLeftWidth,
    fontSize: globalColors.siteDataSidebarItemFontSize,
    lineHeight: globalColors.siteDataSidebarItemLineHeight,
    marginTop: globalColors.siteDataSidebarItemMarginTop,
  },
  sidebarFirstItem: { marginTop: globalColors.siteDataSidebarFirstItemMarginTop },
  sidebarLink: {
    backgroundColor: { ":hover": globalColors.siteDataSidebarLinkHoverBackground },
    color: globalColors.siteDataSidebarLinkColor,
    display: globalColors.siteDataSidebarLinkDisplay,
    outline: {
      default: globalColors.siteDataSidebarLinkOutline,
      ":hover": globalColors.siteDataSidebarLinkHoverOutline,
      ":focus": globalColors.siteDataSidebarLinkHoverOutline,
    },
    padding: globalColors.siteDataSidebarLinkPadding,
    textDecoration: {
      default: globalColors.siteDataSidebarLinkTextDecoration,
      ":hover": globalColors.siteDataSidebarLinkHoverTextDecoration,
      ":focus": globalColors.siteDataSidebarLinkHoverTextDecoration,
    },
  },
  sidebarBadge: {
    backgroundColor: globalColors.siteDataSidebarBadgeBackground,
    borderColor: globalColors.siteDataSidebarBadgeBorderColor,
    borderRadius: globalColors.siteDataSidebarBadgeBorderRadius,
    borderStyle: globalColors.siteDataSidebarBadgeBorderStyle,
    borderWidth: globalColors.siteDataSidebarBadgeBorderWidth,
    boxShadow: globalColors.siteDataSidebarBadgeBoxShadow,
    color: globalColors.siteDataSidebarBadgeColor,
    fontSize: globalColors.siteDataSidebarBadgeFontSize,
    lineHeight: globalColors.siteDataSidebarBadgeLineHeight,
    padding: globalColors.siteDataSidebarBadgePadding,
  },
  warningSurface: { display: globalColors.siteDataWarningDisplay },
  warning: { color: globalColors.siteDataWarningText },
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
    float: globalColors.siteDataTitleHeadingFloat,
  },
  exportAction: {
    backgroundColor: {
      default: globalColors.siteDataExportActionSurface,
      ":hover": globalColors.siteDataExportActionInteractiveSurface,
      ":focus": globalColors.siteDataExportActionInteractiveSurface,
      ":active": globalColors.siteDataExportActionInteractiveSurface,
    },
    borderColor: {
      default: globalColors.siteDataExportActionBorderColor,
      ":hover": globalColors.siteDataExportActionBorderColor,
      ":focus": globalColors.siteDataExportActionBorderColor,
      ":active": globalColors.siteDataExportActionBorderColor,
    },
    borderRadius: globalColors.siteDataExportActionBorderRadius,
    borderStyle: globalColors.siteDataExportActionBorderStyle,
    borderWidth: globalColors.siteDataExportActionBorderWidth,
    boxShadow: globalColors.siteDataExportActionBoxShadow,
    color: globalColors.siteDataExportActionText,
    cursor: globalColors.siteDataExportActionCursor,
    display: globalColors.siteDataExportActionDisplay,
    fontSize: globalColors.siteDataExportActionFontSize,
    lineHeight: globalColors.siteDataExportActionLineHeight,
    marginBottom: globalColors.siteDataExportActionMarginBottom,
    marginLeft: globalColors.siteDataExportActionMarginLeft,
    outline: globalColors.siteDataExportActionOutline,
    padding: globalColors.siteDataExportActionPadding,
    position: globalColors.siteDataExportActionPosition,
    textAlign: globalColors.siteDataExportActionTextAlign,
    textDecoration: {
      ":hover": globalColors.siteDataExportActionInteractiveTextDecoration,
      ":focus": globalColors.siteDataExportActionInteractiveTextDecoration,
      ":active": globalColors.siteDataExportActionInteractiveTextDecoration,
    },
    textShadow: globalColors.siteDataExportActionTextShadow,
    transition: globalColors.siteDataExportActionTransition,
    verticalAlign: globalColors.siteDataExportActionVerticalAlign,
    whiteSpace: globalColors.siteDataExportActionWhiteSpace,
    zIndex: globalColors.siteDataExportActionZIndex,
  },
});

const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const warningSurfaceStyleProps = stylex.props(styles.warningSurface);
const warningStyleProps = stylex.props(styles.warning);

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

export const Route = createFileRoute("/sites/data")({
  component: SiteDataRoute,
});

function SiteDataRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteDataScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteDataScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));
  const sessionBootstrapQuery = useQuery({
    queryFn: () => readSessionBootstrap(runtimeConfig),
    queryKey: ["site-data", "session-bootstrap"],
  });
  const exportDataPath = "/sites/export" as "/";
  const exportDataHref = prefixBasePath(runtimeConfig.basePath, "/sites/export");

  return (
    <>
      <title>{t("title.siteSetting")}</title>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{t("site.sidebar")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <div {...titleAreaStyleProps} data-stylex-owner="site-data-title-strip">
                <h2 {...titleStyleProps} data-stylex-owner="site-data-title-heading">
                  {t("site.sidebar.data")}
                </h2>
              </div>

              <div {...warningSurfaceStyleProps} data-stylex-owner="site-data-warning-surface">
                <ul>
                  <li {...warningStyleProps} data-stylex-owner="site-data-warning-item">
                    <strong>{t("site.data.warning1")}</strong>
                  </li>
                  <li {...warningStyleProps} data-stylex-owner="site-data-warning-item">
                    <strong>{t("site.data.warning2")}</strong>
                  </li>
                  <li {...warningStyleProps} data-stylex-owner="site-data-warning-item">
                    <strong>{t("site.data.warning3")}</strong>
                  </li>
                </ul>
              </div>

              <h3>{t("site.data.export")}</h3>
              <p>{t("site.data.export.info")}</p>

              <Link
                href={exportDataHref}
                to={exportDataPath}
                reloadDocument
                {...stylex.props(styles.exportAction)}
                data-stylex-owner="site-data-export-action"
              >
                <strong>{t("site.data.export")}</strong>
              </Link>

              <h3>{t("site.data.import")}</h3>
              <p>{t("site.data.import.info")}</p>

              <form
                action={prefixBasePath(runtimeConfig.basePath, "/sites/import")}
                method="post"
                encType="multipart/form-data"
              >
                {sessionBootstrapQuery.data?.csrfToken ? (
                  <input
                    type="hidden"
                    name="csrfToken"
                    value={sessionBootstrapQuery.data.csrfToken}
                  />
                ) : null}
                <input type="file" name="data" />
                <p>
                  <input type="submit" />
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul {...stylex.props(styles.sidebar)} data-stylex-owner="site-data-sidebar">
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarFirstItem)}
        data-stylex-owner="site-data-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/userList"
        >
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-data-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-data-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-data-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/projectList"
        >
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-data-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/mail"
        >
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-data-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-data-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/update"
        >
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? (
            <span
              {...stylex.props(styles.sidebarBadge)}
              data-stylex-owner="site-data-sidebar-badge"
            >
              1
            </span>
          ) : null}
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-data-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-data-sidebar-link"
          to="/sites/diagnostic"
        >
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
