import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

export const Route = createFileRoute("/sites/massmail")({
  component: SiteMassMailRoute,
});

function SiteMassMailRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteMassMailScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteMassMailScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
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
              <SiteAdminSidebar runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="title.massMail" />
                </h2>
              </div>
              <MassMailBody />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SiteAdminSidebar({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail", active: true },
    { href: "/sites/update", labelKey: "site.sidebar.update" },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <a href={prefixBasePath(runtimeConfig.basePath, item.href)}>
            <LegacyMessage messageKey={item.labelKey} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function MassMailBody() {
  const { t } = useLegacyMessages();

  return (
    <div className="mess-mail-wrap">
      <label className="radio" htmlFor="mailtoAll">
        <input
          type="radio"
          name="mailingType"
          id="mailtoAll"
          value="all"
          defaultChecked
          data-toggle="mail-type"
          data-action="hide"
        />
        {t("site.massMail.toAll")}
      </label>
      <label className="radio" htmlFor="mailtoPrj">
        <input
          type="radio"
          name="mailingType"
          id="mailtoPrj"
          value="projects"
          data-toggle="mail-type"
          data-action="show"
        />
        {t("site.massMail.toProjects")}
      </label>
      <div className="control-group hide" id="project-list-wrap">
        <div className="controls">
          <input
            id="input-project"
            type="text"
            className="span3"
            data-provider="typeahead"
            autoComplete="off"
            placeholder={t("project.name")}
          />
          <button
            id="select-project"
            type="submit"
            className="ybtn"
            data-loading-text={t("site.massMail.loading")}
          >
            <strong>{t("button.add")}</strong>
          </button>
        </div>
        <div id="selected-projects"></div>
      </div>
      <button id="write-email" type="submit" className="ybtn ybtn-primary">
        <strong>{t("site.mail.write")}</strong>
      </button>
    </div>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
