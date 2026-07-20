import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { siteDiagnosticsQueryOptions, siteUpdateQueryOptions } from "../../api/site-admin";
import type { SiteDiagnosticsResponse } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { globalBreakpoints } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteDiagnosticColors } from "./-diagnostic.stylex";

const styles = stylex.create({
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: { default: null, [globalBreakpoints.mobile]: "10px" },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: { margin: "0px auto" },
  breadcrumbHeading: {
    lineHeight: "30px",
    padding: "10px 10px 5px",
  },
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
  sidebar: {
    margin: "0px",
    padding: "0px",
    listStyle: "none",
  },
  sidebarItem: {
    borderLeftColor: siteDiagnosticColors.sidebarBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarFirstItem: { marginTop: "0px" },
  sidebarActiveItem: {
    borderLeftColor: siteDiagnosticColors.sidebarActiveBorder,
    fontWeight: "bold",
  },
  sidebarLink: {
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
    backgroundColor: { ":hover": siteDiagnosticColors.sidebarHoverSurface },
  },
  sidebarActiveLink: {
    backgroundColor: { ":hover": "transparent" },
  },
  sidebarBadge: {
    backgroundColor: siteDiagnosticColors.badgeSurface,
    borderColor: siteDiagnosticColors.badgeBorder,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: siteDiagnosticColors.badgeShadow,
    color: siteDiagnosticColors.badgeText,
    fontSize: "12px",
    lineHeight: "20px",
    padding: "0px 5px",
  },
  noErrorTitleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteDiagnosticColors.titleBorder,
  },
  noErrorHeading: {
    float: "left",
    margin: "0px",
    fontSize: "1.5em",
    color: siteDiagnosticColors.titleText,
    lineHeight: "30px",
  },
  errorTitleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteDiagnosticColors.titleBorder,
  },
  errorHeading: {
    float: "left",
    margin: "0px",
    fontSize: "1.5em",
    color: siteDiagnosticColors.titleText,
    lineHeight: "30px",
  },
  errorPre: {
    fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
    color: siteDiagnosticColors.errorText,
    display: "block",
    padding: "9.5px",
    margin: "0px 0px 10px",
    fontSize: "13px",
    lineHeight: "20px",
    wordBreak: "break-all",
    overflowWrap: "break-word",
    whiteSpace: "pre-wrap",
    backgroundColor: siteDiagnosticColors.errorSurface,
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: siteDiagnosticColors.errorBorder,
    borderRadius: "4px",
  },
});

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyDiagnosticSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };

export const Route = createFileRoute("/sites/diagnostic")({
  component: SiteDiagnosticRoute,
});

function SiteDiagnosticRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteDiagnosticScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteDiagnosticScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const query = useQuery(siteDiagnosticsQueryOptions(runtimeConfig));
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));
  const diagnosticErrors = query.data?.errors ?? [];
  const hasNoDiagnosticErrors = diagnosticErrors.length === 0;

  return (
    <>
      <title>{t("title.siteSetting")}</title>
      <div
        {...stylex.props(styles.breadcrumbOuter)}
        data-stylex-owner="site-diagnostic-breadcrumb-outer"
      >
        <div
          {...stylex.props(styles.breadcrumbInner)}
          data-stylex-owner="site-diagnostic-breadcrumb-inner"
        >
          <h3
            {...stylex.props(styles.breadcrumbHeading)}
            data-stylex-owner="site-diagnostic-breadcrumb-heading"
          >
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div {...stylex.props(styles.page)} data-stylex-owner="site-diagnostic-page">
        <div {...stylex.props(styles.settingWrap)} data-stylex-owner="site-diagnostic-content">
          <div
            {...stylex.props(styles.settingGrid)}
            data-stylex-owner="site-diagnostic-setting-grid"
          >
            <div
              {...stylex.props(styles.settingColumn, styles.settingSidebarColumn)}
              data-stylex-owner="site-diagnostic-sidebar-column"
            >
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div
              {...stylex.props(styles.settingColumn, styles.settingContentColumn)}
              data-stylex-owner="site-diagnostic-setting-content-column"
            >
              <div
                {...(hasNoDiagnosticErrors
                  ? stylex.props(styles.noErrorTitleArea)
                  : stylex.props(styles.errorTitleArea))}
                data-stylex-owner={
                  hasNoDiagnosticErrors
                    ? "site-diagnostic-no-error-title"
                    : "site-diagnostic-error-title"
                }
              >
                <h2
                  {...(hasNoDiagnosticErrors
                    ? stylex.props(styles.noErrorHeading)
                    : stylex.props(styles.errorHeading))}
                >
                  <LegacyMessage messageKey="site.sidebar.diagnostics" />
                </h2>
              </div>
              <DiagnosticBody diagnosticErrors={diagnosticErrors} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul {...stylex.props(styles.sidebar)} data-stylex-owner="site-diagnostic-sidebar">
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarFirstItem)}
        data-stylex-owner="site-diagnostic-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          to="/sites/userList"
        >
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-diagnostic-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-diagnostic-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-diagnostic-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          to="/sites/projectList"
        >
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-diagnostic-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          to="/sites/mail"
        >
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-diagnostic-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-diagnostic-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          to="/sites/update"
        >
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? (
            <span
              {...stylex.props(styles.sidebarBadge)}
              data-stylex-owner="site-diagnostic-sidebar-badge"
            >
              1
            </span>
          ) : null}
        </Link>
      </li>
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarActiveItem)}
        data-stylex-owner="site-diagnostic-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink, styles.sidebarActiveLink)}
          data-stylex-owner="site-diagnostic-sidebar-link"
          search={legacyDiagnosticSidebarSearch}
          to="/sites/diagnostic"
        >
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function DiagnosticBody({
  diagnosticErrors,
}: {
  diagnosticErrors: SiteDiagnosticsResponse["errors"];
}) {
  const { t } = useLegacyMessages();
  if (diagnosticErrors.length === 0) {
    return <p>{t("site.diagnostic.errorNotFound")}</p>;
  }

  return (
    <>
      <p>{t("site.diagnostic.errorFound", { args: [String(diagnosticErrors.length)] })}</p>
      <ul data-stylex-owner="site-diagnostic-error-pre">
        {diagnosticErrors.map((error) => (
          <li key={error}>
            <pre {...stylex.props(styles.errorPre)}>{error}</pre>
          </li>
        ))}
      </ul>
    </>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
