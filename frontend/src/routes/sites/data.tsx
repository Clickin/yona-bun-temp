import { useQuery } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { siteSettingWrapClassName } from "../../components/site-admin-sidebar";
import { createFileRoute, Link } from "@tanstack/react-router";
import { siteUpdateQueryOptions } from "../../api/site-admin";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

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
      <div data-owner="site-data-breadcrumb-outer">
        <div data-owner="site-data-breadcrumb-inner">
          <h3 data-owner="site-data-breadcrumb-heading">{t("site.sidebar")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-data-page">
        <div className={siteSettingWrapClassName} data-owner="site-data-content">
          <div className="row-fluid" data-owner="site-data-setting-grid">
            <div className="span2" data-owner="site-data-sidebar-column">
              <SiteAdminSidebar
                badgeOwner="site-data-sidebar-badge"
                baseLinkProps={legacySiteSidebarLinkProps}
                navOwner="site-data-sidebar"
                ownerPrefix="site-data-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  badge: [],
                  firstItem: [],
                  item: [],
                  link: [],
                  nav: [],
                }}
                ulClassName="site-setting-nav"
              />
            </div>
            <div className="span10" data-owner="site-data-setting-content-column">
              <div className="title_area" data-owner="site-data-title-strip">
                <h2 className="pull-left" data-owner="site-data-title-heading">
                  {t("site.sidebar.data")}
                </h2>
              </div>

              <div className="cu-desc" data-owner="site-data-warning-surface">
                <ul>
                  <li className="notice" data-owner="site-data-warning-item">
                    <strong>{t("site.data.warning1")}</strong>
                  </li>
                  <li className="notice" data-owner="site-data-warning-item">
                    <strong>{t("site.data.warning2")}</strong>
                  </li>
                  <li className="notice" data-owner="site-data-warning-item">
                    <strong>{t("site.data.warning3")}</strong>
                  </li>
                </ul>
              </div>

              <h3>{t("site.data.export")}</h3>
              <p>{t("site.data.export.info")}</p>

              <Link
                className="ybtn ybtn-primary"
                href={exportDataHref}
                to={exportDataPath}
                reloadDocument
                data-owner="site-data-export-action"
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
