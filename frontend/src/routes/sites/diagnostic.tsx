import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { siteDiagnosticsQueryOptions, siteUpdateQueryOptions } from "../../api/site-admin";
import type { SiteDiagnosticsResponse } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { globalColors } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";

const styles = stylex.create({
  sidebar: {
    margin: globalColors.siteDiagnosticSidebarMargin,
    padding: globalColors.siteDiagnosticSidebarPadding,
    listStyle: globalColors.siteDiagnosticSidebarListStyle,
  },
  sidebarItem: {
    borderLeftColor: globalColors.siteDiagnosticSidebarItemBorderLeftColor,
    borderLeftStyle: globalColors.siteDiagnosticSidebarItemBorderLeftStyle,
    borderLeftWidth: globalColors.siteDiagnosticSidebarItemBorderLeftWidth,
    fontSize: globalColors.siteDiagnosticSidebarItemFontSize,
    lineHeight: globalColors.siteDiagnosticSidebarItemLineHeight,
    marginTop: globalColors.siteDiagnosticSidebarItemMarginTop,
  },
  sidebarFirstItem: { marginTop: globalColors.siteDiagnosticSidebarFirstItemMarginTop },
  sidebarActiveItem: {
    borderLeftColor: globalColors.siteDiagnosticSidebarActiveItemBorderLeftColor,
    fontWeight: globalColors.siteDiagnosticSidebarActiveItemFontWeight,
  },
  sidebarLink: {
    color: globalColors.siteDiagnosticSidebarLinkColor,
    display: globalColors.siteDiagnosticSidebarLinkDisplay,
    outline: {
      default: globalColors.siteDiagnosticSidebarLinkOutline,
      ":hover": globalColors.siteDiagnosticSidebarLinkHoverOutline,
      ":focus": globalColors.siteDiagnosticSidebarLinkHoverOutline,
    },
    padding: globalColors.siteDiagnosticSidebarLinkPadding,
    textDecoration: {
      default: globalColors.siteDiagnosticSidebarLinkTextDecoration,
      ":hover": globalColors.siteDiagnosticSidebarLinkHoverTextDecoration,
      ":focus": globalColors.siteDiagnosticSidebarLinkHoverTextDecoration,
    },
    backgroundColor: { ":hover": globalColors.siteDiagnosticSidebarLinkHoverBackground },
  },
  sidebarActiveLink: {
    backgroundColor: { ":hover": globalColors.siteDiagnosticSidebarActiveLinkHoverBackground },
  },
  sidebarBadge: {
    backgroundColor: globalColors.siteDiagnosticSidebarBadgeBackground,
    borderColor: globalColors.siteDiagnosticSidebarBadgeBorderColor,
    borderRadius: globalColors.siteDiagnosticSidebarBadgeBorderRadius,
    borderStyle: globalColors.siteDiagnosticSidebarBadgeBorderStyle,
    borderWidth: globalColors.siteDiagnosticSidebarBadgeBorderWidth,
    boxShadow: globalColors.siteDiagnosticSidebarBadgeBoxShadow,
    color: globalColors.siteDiagnosticSidebarBadgeColor,
    fontSize: globalColors.siteDiagnosticSidebarBadgeFontSize,
    lineHeight: globalColors.siteDiagnosticSidebarBadgeLineHeight,
    padding: globalColors.siteDiagnosticSidebarBadgePadding,
  },
  noErrorTitleArea: {
    overflow: globalColors.siteDiagnosticNoErrorTitleOverflow,
    marginBottom: globalColors.siteDiagnosticNoErrorTitleMarginBottom,
    paddingBottom: globalColors.siteDiagnosticNoErrorTitlePaddingBottom,
    borderBottomStyle: globalColors.siteDiagnosticNoErrorTitleBorderStyle,
    borderBottomWidth: globalColors.siteDiagnosticNoErrorTitleBorderBottomWidth,
    borderBottomColor: globalColors.siteDiagnosticNoErrorTitleBorder,
  },
  noErrorHeading: {
    margin: globalColors.siteDiagnosticNoErrorHeadingMargin,
    fontSize: globalColors.siteDiagnosticNoErrorHeadingFontSize,
    color: globalColors.siteDiagnosticNoErrorHeadingText,
    lineHeight: globalColors.siteDiagnosticNoErrorHeadingLineHeight,
  },
  errorTitleArea: {
    overflow: globalColors.siteDiagnosticNoErrorTitleOverflow,
    marginBottom: globalColors.siteDiagnosticNoErrorTitleMarginBottom,
    paddingBottom: globalColors.siteDiagnosticNoErrorTitlePaddingBottom,
    borderBottomStyle: globalColors.siteDiagnosticNoErrorTitleBorderStyle,
    borderBottomWidth: globalColors.siteDiagnosticNoErrorTitleBorderBottomWidth,
    borderBottomColor: globalColors.siteDiagnosticNoErrorTitleBorder,
  },
  errorHeading: {
    margin: globalColors.siteDiagnosticNoErrorHeadingMargin,
    fontSize: globalColors.siteDiagnosticNoErrorHeadingFontSize,
    color: globalColors.siteDiagnosticNoErrorHeadingText,
    lineHeight: globalColors.siteDiagnosticNoErrorHeadingLineHeight,
  },
  errorPre: {
    fontFamily: globalColors.siteDiagnosticErrorPreFontFamily,
    color: globalColors.siteDiagnosticErrorPreText,
    display: globalColors.siteDiagnosticErrorPreDisplay,
    padding: globalColors.siteDiagnosticErrorPrePadding,
    margin: globalColors.siteDiagnosticErrorPreMargin,
    fontSize: globalColors.siteDiagnosticErrorPreFontSize,
    lineHeight: globalColors.siteDiagnosticErrorPreLineHeight,
    wordBreak: globalColors.siteDiagnosticErrorPreWordBreak,
    overflowWrap: globalColors.siteDiagnosticErrorPreWordWrap,
    whiteSpace: globalColors.siteDiagnosticErrorPreWhiteSpace,
    backgroundColor: globalColors.siteDiagnosticErrorPreSurface,
    borderStyle: globalColors.siteDiagnosticErrorPreBorderStyle,
    borderWidth: globalColors.siteDiagnosticErrorPreBorderWidth,
    borderColor: globalColors.siteDiagnosticErrorPreBorder,
    borderRadius: globalColors.siteDiagnosticErrorPreRadius,
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
                {...(hasNoDiagnosticErrors
                  ? stylex.props(styles.noErrorTitleArea)
                  : stylex.props(styles.errorTitleArea))}
                className="title_area"
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
                  className="pull-left"
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
