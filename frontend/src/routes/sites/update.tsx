import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { siteUpdateQueryOptions, type SiteUpdateResponse } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteUpdateColors } from "./-update.stylex";

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyUpdateSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };
const styles = stylex.create({
  page: {
    marginTop: "10px",
    minHeight: "450px",
    "@media all and (max-width: 720px)": {
      boxSizing: "border-box",
      minWidth: "10px",
      padding: "0px",
      width: "100%",
    },
  },
  content: { margin: "0px auto" },
  grid: {
    width: "100%",
    "::before": { content: '\"\"', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '\"\"', display: "table", lineHeight: "0px" },
  },
  sidebarColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "0px",
    minHeight: "30px",
    width: {
      default: "14.893617021276595%",
      "@media (min-width: 1200px)": "14.52991452991453%",
      "@media (min-width: 768px) and (max-width: 979px)": "14.3646408839779%",
      "@media (max-width: 767px)": "100%",
    },
    "@media (max-width: 767px)": { float: "none" },
  },
  contentColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "2.127659574468085%",
    minHeight: "30px",
    width: "82.97872340425532%",
    "@media (min-width: 1200px)": {
      marginLeft: "2.564102564102564%",
      width: "82.90598290598291%",
    },
    "@media (min-width: 768px) and (max-width: 979px)": {
      marginLeft: "2.7624309392265194%",
      width: "82.87292817679558%",
    },
    "@media (max-width: 767px)": { float: "none", marginLeft: "0px", width: "100%" },
  },
  sidebar: {
    margin: "0px",
    padding: "0px",
    listStyle: "none",
  },
  sidebarItem: {
    borderLeftColor: siteUpdateColors.sidebarBorder,
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
    borderLeftColor: siteUpdateColors.sidebarActiveBorder,
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
    backgroundColor: {
      ":hover": siteUpdateColors.sidebarHoverSurface,
    },
  },
  sidebarActiveLink: {
    backgroundColor: {
      ":hover": "transparent",
    },
  },
  sidebarBadge: {
    backgroundColor: siteUpdateColors.badgeSurface,
    borderColor: siteUpdateColors.badgeBorder,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: siteUpdateColors.badgeShadow,
    color: siteUpdateColors.badgeText,
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
    borderBottomColor: siteUpdateColors.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: siteUpdateColors.titleText,
    lineHeight: "30px",
    float: "left",
  },
  noUpdateParagraph: {
    margin: "0px",
  },
  availableParagraph: {
    margin: "0px",
  },
  availableStrong: {
    fontWeight: "bold",
  },
  downloadAction: {
    backgroundColor: {
      default: siteUpdateColors.actionSurface,
      ":hover": siteUpdateColors.actionInteractiveSurface,
      ":focus": siteUpdateColors.actionInteractiveSurface,
      ":active": siteUpdateColors.actionInteractiveSurface,
    },
    borderColor: siteUpdateColors.actionBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteUpdateColors.actionShadow,
    color: siteUpdateColors.actionText,
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
  errorPre: {
    fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
    color: siteUpdateColors.errorText,
    display: "block",
    padding: "9.5px",
    margin: "0px 0px 10px",
    fontSize: "13px",
    lineHeight: "20px",
    wordBreak: "break-all",
    overflowWrap: "break-word",
    whiteSpace: "pre-wrap",
    backgroundColor: siteUpdateColors.errorSurface,
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: siteUpdateColors.errorBorder,
    borderRadius: "4px",
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const noUpdateParagraphStyleProps = stylex.props(styles.noUpdateParagraph);

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
      <div {...stylex.props(styles.page)} data-stylex-owner="site-update-page">
        <div {...stylex.props(styles.content)} data-stylex-owner="site-update-content">
          <div {...stylex.props(styles.grid)} data-stylex-owner="site-update-setting-grid">
            <div {...stylex.props(styles.sidebarColumn)} data-stylex-owner="site-update-sidebar-column">
              <SiteAdminSidebar showUpdateBadge={Boolean(query.data?.versionToUpdate)} />
            </div>
            <div
              {...stylex.props(styles.contentColumn)}
              data-stylex-owner="site-update-setting-content-column"
            >
              <div {...titleAreaStyleProps} data-stylex-owner="site-update-title-strip">
                <h2 {...titleStyleProps} data-stylex-owner="site-update-title-heading">
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
    <ul {...stylex.props(styles.sidebar)} data-stylex-owner="site-update-sidebar">
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarFirstItem)}
        data-stylex-owner="site-update-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-update-sidebar-link"
          to="/sites/userList"
        >
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-update-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-update-sidebar-link"
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-update-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-update-sidebar-link"
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-update-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-update-sidebar-link"
          to="/sites/projectList"
        >
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-update-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-update-sidebar-link"
          to="/sites/mail"
        >
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-update-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-update-sidebar-link"
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarActiveItem)}
        data-stylex-owner="site-update-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink, styles.sidebarActiveLink)}
          data-stylex-owner="site-update-sidebar-link"
          search={legacyUpdateSidebarSearch}
          to="/sites/update"
        >
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? (
            <span
              {...stylex.props(styles.sidebarBadge)}
              data-stylex-owner="site-update-sidebar-badge"
            >
              1
            </span>
          ) : null}
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-update-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-update-sidebar-link"
          to="/sites/diagnostic"
        >
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
        <p
          {...stylex.props(styles.availableParagraph)}
          data-stylex-owner="site-update-available-message"
        >
          <strong
            {...stylex.props(styles.availableStrong)}
            data-stylex-owner="site-update-available-message-strong"
          >
            {t("site.update.isAvailable", { args: [response.versionToUpdate] })}
          </strong>
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
        <p {...noUpdateParagraphStyleProps} data-stylex-owner="site-update-current-version">
          {t("site.update.currentVersion", { args: [response.currentVersion] })}
        </p>
      ) : null}
      {!response.versionToUpdate && !response.error ? (
        <p {...noUpdateParagraphStyleProps} data-stylex-owner="site-update-latest-version">
          {t("site.update.isNotNecessary", { args: [response.currentVersion] })}
        </p>
      ) : null}
      {response.error ? (
        <>
          <p>{t("site.update.error")}</p>
          <pre {...stylex.props(styles.errorPre)} data-stylex-owner="site-update-error-pre">
            {response.error}
          </pre>
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
