import { useQuery } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
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
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: {
      default: null,
      "@media (max-width: 720px)": "10px",
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
const breadcrumbOuterStyleProps = stylex.props(styles.breadcrumbOuter);
const breadcrumbInnerStyleProps = stylex.props(styles.breadcrumbInner);
const breadcrumbHeadingStyleProps = stylex.props(styles.breadcrumbHeading);
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
      <div
        {...breadcrumbOuterStyleProps}
        className={`site-breadcrumb-outer ${breadcrumbOuterStyleProps.className ?? ""}`}
        data-stylex-owner="site-update-breadcrumb-outer"
      >
        <div
          {...breadcrumbInnerStyleProps}
          className={`site-breadcrumb-inner ${breadcrumbInnerStyleProps.className ?? ""}`}
          data-stylex-owner="site-update-breadcrumb-inner"
        >
          <h3 {...breadcrumbHeadingStyleProps} data-stylex-owner="site-update-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-stylex-owner="site-update-page">
        <div className="site-setting-wrap" data-stylex-owner="site-update-setting-wrap">
          <div className="row-fluid" data-stylex-owner="site-update-setting-grid">
            <div className="span2" data-stylex-owner="site-update-sidebar-column">
              <SiteAdminSidebar
                activeItemClassName="active"
                activeTo="/sites/update"
                badgeOwner="site-update-sidebar-badge"
                baseLinkProps={legacySiteSidebarLinkProps}
                linkPropsByTo={{ "/sites/update": { search: legacyUpdateSidebarSearch } }}
                navOwner="site-update-sidebar"
                ownerPrefix="site-update-sidebar"
                showUpdateBadge={Boolean(query.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [styles.sidebarItem, styles.sidebarActiveItem],
                  badge: [styles.sidebarBadge],
                  firstItem: [styles.sidebarItem, styles.sidebarFirstItem],
                  item: [styles.sidebarItem],
                  nav: [styles.sidebar],
                }}
                ulClassName="site-setting-nav"
              />
            </div>
            <div className="span10" data-stylex-owner="site-update-setting-content-column">
              <div
                {...titleAreaStyleProps}
                className={`title_area ${titleAreaStyleProps.className ?? ""}`}
                data-stylex-owner="site-update-title-strip"
              >
                <h2
                  {...titleStyleProps}
                  className={`pull-left ${titleStyleProps.className ?? ""}`}
                  data-stylex-owner="site-update-title-heading"
                >
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

function UpdateBody({ response }: { response: SiteUpdateResponse | undefined }) {
  const { t } = useLegacyMessages();
  if (!response) {
    return null;
  }
  const releaseUrl = response.releaseUrl?.trim();
  const downloadTarget = releaseUrl;

  return (
    <>
      {response.versionToUpdate ? (
        <p
          {...stylex.props(styles.availableParagraph)}
          style={{ lineHeight: "20px" }}
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
                to={downloadTarget}
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
        <p
          {...noUpdateParagraphStyleProps}
          style={{ lineHeight: "20px" }}
          data-stylex-owner="site-update-current-version"
        >
          {t("site.update.currentVersion", { args: [response.currentVersion] })}
        </p>
      ) : null}
      {!response.versionToUpdate && !response.error ? (
        <p
          {...noUpdateParagraphStyleProps}
          style={{ lineHeight: "20px" }}
          data-stylex-owner="site-update-latest-version"
        >
          {t("site.update.isNotNecessary", { args: [response.currentVersion] })}
        </p>
      ) : null}
      {response.error ? (
        <>
          <p style={{ lineHeight: "20px" }}>{t("site.update.error")}</p>
          <pre {...stylex.props(styles.errorPre)} data-stylex-owner="site-update-error-pre">
            {response.error}
          </pre>
        </>
      ) : null}
    </>
  );
}

function SiteUpdateTitle() {
  const { t } = useLegacyMessages();
  return <title>{t("title.siteSetting")}</title>;
}
