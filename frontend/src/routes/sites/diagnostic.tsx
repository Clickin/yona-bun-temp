import { useQuery } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { siteSettingWrapClassName } from "../../components/site-admin-sidebar";
import { createFileRoute } from "@tanstack/react-router";
import { siteDiagnosticsQueryOptions, siteUpdateQueryOptions } from "../../api/site-admin";
import type { SiteDiagnosticsResponse } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

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
      <div data-owner="site-diagnostic-breadcrumb-outer">
        <div data-owner="site-diagnostic-breadcrumb-inner">
          <h3 data-owner="site-diagnostic-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-diagnostic-page">
        <div className={siteSettingWrapClassName} data-owner="site-diagnostic-content">
          <div className="row-fluid" data-owner="site-diagnostic-setting-grid">
            <div className="span2" data-owner="site-diagnostic-sidebar-column">
              <SiteAdminSidebar
                activeItemClassName="active"
                activeTo="/sites/diagnostic"
                badgeOwner="site-diagnostic-sidebar-badge"
                baseLinkProps={legacySiteSidebarLinkProps}
                linkPropsByTo={{ "/sites/diagnostic": { search: legacyDiagnosticSidebarSearch } }}
                navOwner="site-diagnostic-sidebar"
                ownerPrefix="site-diagnostic-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
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
            <div className="span10" data-owner="site-diagnostic-setting-content-column">
              <div
                className="title_area"
                data-owner={
                  hasNoDiagnosticErrors
                    ? "site-diagnostic-no-error-title"
                    : "site-diagnostic-error-title"
                }
              >
                <h2 className="pull-left">
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
      <ul data-owner="site-diagnostic-error-pre">
        {diagnosticErrors.map((error) => (
          <li key={error}>
            <pre>{error}</pre>
          </li>
        ))}
      </ul>
    </>
  );
}
