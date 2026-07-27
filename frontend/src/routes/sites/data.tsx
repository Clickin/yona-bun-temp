import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { siteUpdateQueryOptions } from "../../api/site-admin";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { globalBreakpoints } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteDataColors } from "./-data.stylex";

const styles = stylex.create({
  page: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: {
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
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: {
      default: null,
      [globalBreakpoints.mobile]: "10px",
    },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: { margin: "0px auto" },
  breadcrumbHeading: {
    lineHeight: "30px",
    padding: "10px 10px 5px",
  },
  sidebar: {
    margin: "0px",
    padding: "0px",
    listStyle: "none",
  },
  sidebarItem: {
    borderLeftColor: siteDataColors.sidebarBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarFirstItem: { marginTop: "0px" },
  sidebarLink: {
    backgroundColor: { ":hover": siteDataColors.sidebarLinkHoverSurface },
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
  sidebarBadge: {
    backgroundColor: siteDataColors.badgeSurface,
    borderColor: siteDataColors.badgeBorder,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: siteDataColors.badgeShadow,
    color: siteDataColors.badgeText,
    fontSize: "12px",
    lineHeight: "20px",
    padding: "0px 5px",
  },
  warningSurface: { display: "inline-block" },
  warning: { color: siteDataColors.warningText },
  titleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteDataColors.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: siteDataColors.titleText,
    lineHeight: "30px",
    float: "left",
  },
  exportAction: {
    backgroundColor: {
      default: siteDataColors.actionSurface,
      ":hover": siteDataColors.actionInteractiveSurface,
      ":focus": siteDataColors.actionInteractiveSurface,
      ":active": siteDataColors.actionInteractiveSurface,
    },
    borderColor: {
      default: siteDataColors.actionBorder,
      ":hover": siteDataColors.actionBorder,
      ":focus": siteDataColors.actionBorder,
      ":active": siteDataColors.actionBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteDataColors.actionShadow,
    color: siteDataColors.actionText,
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: "0.3em",
    outline: "0 none",
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
    zIndex: "2",
  },
});

const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const pageStyleProps = stylex.props(styles.page);
const breadcrumbOuterStyleProps = stylex.props(styles.breadcrumbOuter);
const breadcrumbInnerStyleProps = stylex.props(styles.breadcrumbInner);
const breadcrumbHeadingStyleProps = stylex.props(styles.breadcrumbHeading);
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
      <div {...breadcrumbOuterStyleProps} data-stylex-owner="site-data-breadcrumb-outer">
        <div {...breadcrumbInnerStyleProps} data-stylex-owner="site-data-breadcrumb-inner">
          <h3 {...breadcrumbHeadingStyleProps} data-stylex-owner="site-data-breadcrumb-heading">
            {t("site.sidebar")}
          </h3>
        </div>
      </div>
      <div
        {...pageStyleProps}
        className={`${pageStyleProps.className ?? ""} page-wrap-outer`.trim()}
        data-stylex-owner="site-data-page"
      >
        <div {...stylex.props(styles.settingWrap)} data-stylex-owner="site-data-content">
          <div {...stylex.props(styles.settingGrid)} data-stylex-owner="site-data-setting-grid">
            <div
              {...stylex.props(styles.settingColumn, styles.settingSidebarColumn)}
              data-stylex-owner="site-data-sidebar-column"
            >
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div
              {...stylex.props(styles.settingColumn, styles.settingContentColumn)}
              data-stylex-owner="site-data-setting-content-column"
            >
              <div {...titleAreaStyleProps} data-stylex-owner="site-data-title-strip">
                <h2 {...titleStyleProps} data-stylex-owner="site-data-title-heading">
                  {t("site.sidebar.data")}
                </h2>
              </div>

              <div
                {...warningSurfaceStyleProps}
                className={`${warningSurfaceStyleProps.className ?? ""} cu-desc`.trim()}
                data-stylex-owner="site-data-warning-surface"
              >
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
