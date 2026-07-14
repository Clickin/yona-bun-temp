import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { siteUpdateQueryOptions, type SiteUpdateResponse } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { globalColors } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyUpdateSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };
const styles = stylex.create({
  downloadAction: {
    backgroundColor: {
      default: globalColors.siteUpdateDownloadActionSurface,
      ":hover": globalColors.siteUpdateDownloadActionInteractiveSurface,
      ":focus": globalColors.siteUpdateDownloadActionInteractiveSurface,
      ":active": globalColors.siteUpdateDownloadActionInteractiveSurface,
    },
    borderColor: globalColors.siteUpdateDownloadActionBorderColor,
    borderRadius: globalColors.siteUpdateDownloadActionBorderRadius,
    borderStyle: globalColors.siteUpdateDownloadActionBorderStyle,
    borderWidth: globalColors.siteUpdateDownloadActionBorderWidth,
    boxShadow: globalColors.siteUpdateDownloadActionBoxShadow,
    color: globalColors.siteUpdateDownloadActionText,
    cursor: globalColors.siteUpdateDownloadActionCursor,
    display: globalColors.siteUpdateDownloadActionDisplay,
    fontSize: globalColors.siteUpdateDownloadActionFontSize,
    lineHeight: globalColors.siteUpdateDownloadActionLineHeight,
    marginBottom: globalColors.siteUpdateDownloadActionMarginBottom,
    marginLeft: globalColors.siteUpdateDownloadActionMarginLeft,
    outline: globalColors.siteUpdateDownloadActionOutline,
    padding: globalColors.siteUpdateDownloadActionPadding,
    position: globalColors.siteUpdateDownloadActionPosition,
    textAlign: globalColors.siteUpdateDownloadActionTextAlign,
    textDecoration: {
      ":hover": globalColors.siteUpdateDownloadActionInteractiveTextDecoration,
      ":focus": globalColors.siteUpdateDownloadActionInteractiveTextDecoration,
      ":active": globalColors.siteUpdateDownloadActionInteractiveTextDecoration,
    },
    textShadow: globalColors.siteUpdateDownloadActionTextShadow,
    transition: globalColors.siteUpdateDownloadActionTransition,
    verticalAlign: globalColors.siteUpdateDownloadActionVerticalAlign,
    whiteSpace: globalColors.siteUpdateDownloadActionWhiteSpace,
    zIndex: globalColors.siteUpdateDownloadActionZIndex,
  },
});

export const Route = createFileRoute("/sites/update")({
  component: SiteUpdateRoute,
});

function SiteUpdateRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteUpdateScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteUpdateScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const query = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <SiteUpdateTitle />
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
              <SiteAdminSidebar showUpdateBadge={Boolean(query.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.update" />
                </h2>
              </div>
              <UpdateBody response={query.data} />
            </div>
          </div>
        </div>
      </div>
    </>
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
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/postList">
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
      <li className="active">
        <Link {...legacySiteSidebarLinkProps} search={legacyUpdateSidebarSearch} to="/sites/update">
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

function UpdateBody({ response }: { response: SiteUpdateResponse | undefined }) {
  const { t } = useLegacyMessages();
  if (!response) {
    return null;
  }
  const releaseUrl = response.releaseUrl?.trim();

  return (
    <>
      {response.versionToUpdate ? (
        <p>
          <strong>{t("site.update.isAvailable", { args: [response.versionToUpdate] })}</strong>
          {releaseUrl ? (
            <>
              {" "}
              <Link
                href={releaseUrl}
                to="/"
                {...stylex.props(styles.downloadAction)}
                data-stylex-owner="site-update-download-action"
              >
                {t("site.update.download")}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {response.currentVersion ? (
        <p>{t("site.update.currentVersion", { args: [response.currentVersion] })}</p>
      ) : null}
      {!response.versionToUpdate && !response.error ? (
        <p>{t("site.update.isNotNecessary", { args: [response.currentVersion] })}</p>
      ) : null}
      {response.error ? (
        <>
          <p>{t("site.update.error")}</p>
          <pre>{response.error}</pre>
        </>
      ) : null}
    </>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}

function SiteUpdateTitle() {
  const { t } = useLegacyMessages();
  return <title>{t("title.siteSetting")}</title>;
}
