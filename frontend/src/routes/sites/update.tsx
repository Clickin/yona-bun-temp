import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ComponentType } from "react";
import { siteUpdateQueryOptions, type SiteUpdateResponse } from "../../api/site-admin";
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

export const Route = createFileRoute("/sites/update")({
  component: SiteUpdateRoute,
});

function SiteUpdateRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteUpdateScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteUpdateScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const query = useQuery(siteUpdateQueryOptions(runtimeConfig));

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

function SiteAdminSidebar() {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update", active: true },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
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

function UpdateBody({ response }: { response: SiteUpdateResponse | undefined }) {
  const { t } = useLegacyMessages();
  if (!response) {
    return null;
  }

  return (
    <>
      {response.versionToUpdate ? (
        <p>
          <strong>{t("site.update.isAvailable", { args: [response.versionToUpdate] })}</strong>{" "}
          <a href={response.releaseUrl ?? ""} className="ybtn ybtn-success">
            {t("site.update.download")}
          </a>
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
