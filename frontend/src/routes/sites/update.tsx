import { useQuery } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { createFileRoute, Link } from "@tanstack/react-router";
import { siteUpdateQueryOptions, type SiteUpdateResponse } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type ExternalLinkTarget = NonNullable<React.ComponentProps<typeof Link>["to"]>;

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyUpdateSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };

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

  const siteBreadcrumbOuterClassName = "site-breadcrumb-outer";
  const siteBreadcrumbInnerClassName = "site-breadcrumb-inner";

  return (
    <>
      <SiteUpdateTitle />
      <div className={siteBreadcrumbOuterClassName} data-owner="site-update-breadcrumb-outer">
        <div className={siteBreadcrumbInnerClassName} data-owner="site-update-breadcrumb-inner">
          <h3 data-owner="site-update-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-update-page">
        <div className="site-setting-wrap" data-owner="site-update-setting-wrap">
          <div className="row-fluid" data-owner="site-update-setting-grid">
            <div className="span2" data-owner="site-update-sidebar-column">
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
                  activeItem: [],
                  badge: [],
                  firstItem: [],
                  item: [],
                  nav: [],
                }}
                ulClassName="site-setting-nav"
              />
            </div>
            <div className="span10" data-owner="site-update-setting-content-column">
              <div className="title_area" data-owner="site-update-title-strip">
                <h2 className="pull-left" data-owner="site-update-title-heading">
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

  return (
    <>
      {response.versionToUpdate ? (
        <p style={{ lineHeight: "20px" }} data-owner="site-update-available-message">
          <strong data-owner="site-update-available-message-strong">
            {t("site.update.isAvailable", { args: [response.versionToUpdate] })}
          </strong>
          {releaseUrl ? (
            <>
              {" "}
              <Link
                href={releaseUrl}
                to={releaseUrl as unknown as ExternalLinkTarget}
                data-owner="site-update-download-action"
              >
                {t("site.update.download")}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {response.currentVersion ? (
        <p style={{ lineHeight: "20px" }} data-owner="site-update-current-version">
          {t("site.update.currentVersion", { args: [response.currentVersion] })}
        </p>
      ) : null}
      {!response.versionToUpdate && !response.error ? (
        <p style={{ lineHeight: "20px" }} data-owner="site-update-latest-version">
          {t("site.update.isNotNecessary", { args: [response.currentVersion] })}
        </p>
      ) : null}
      {response.error ? (
        <>
          <p style={{ lineHeight: "20px" }}>{t("site.update.error")}</p>
          <pre data-owner="site-update-error-pre">{response.error}</pre>
        </>
      ) : null}
    </>
  );
}

function SiteUpdateTitle() {
  const { t } = useLegacyMessages();
  return <title>{t("title.siteSetting")}</title>;
}
