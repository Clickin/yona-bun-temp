import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ComponentType } from "react";
import { siteDiagnosticsQueryOptions } from "../../api/site-admin";
import type { SiteDiagnosticsResponse } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    activeProps?: { className?: string | undefined };
    to: string;
  }
>;

export const Route = createFileRoute("/sites/diagnostic")({
  component: SiteDiagnosticRoute,
});

function SiteDiagnosticRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteDiagnosticScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteDiagnosticScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const query = useQuery(siteDiagnosticsQueryOptions(runtimeConfig));

  return (
    <>
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
              <SiteAdminSidebar />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.diagnostics" />
                </h2>
              </div>
              <DiagnosticBody response={query.data} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SiteAdminSidebar() {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update" },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics", active: true },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <LegacyInternalLink activeProps={{ className: undefined }} to={item.href}>
            <LegacyMessage messageKey={item.labelKey} />
          </LegacyInternalLink>
        </li>
      ))}
    </ul>
  );
}

function DiagnosticBody({ response }: { response: SiteDiagnosticsResponse | undefined }) {
  const { t } = useLegacyMessages();
  const errors = response?.errors ?? [];
  if (errors.length === 0) {
    return <p>{t("site.diagnostic.errorNotFound")}</p>;
  }

  return (
    <>
      <p>
        {t("site.diagnostic.errorFound", { args: [String(response?.errorCount ?? errors.length)] })}
      </p>
      <ul>
        {errors.map((error) => (
          <li key={error}>
            <pre>{error}</pre>
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
