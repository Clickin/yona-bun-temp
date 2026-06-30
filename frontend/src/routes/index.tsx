import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { listNotificationsQueryOptions } from "../api/notifications";
import { currentSessionQueryOptions } from "../api/session";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export const Route = createFileRoute("/")({
  component: PublicLandingRoute,
});

function PublicLandingRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <PublicLandingScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function PublicLandingScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const notificationsQuery = useQuery({
    ...listNotificationsQueryOptions(runtimeConfig, { from: 0, size: 20 }),
    enabled: sessionQuery.data?.isAnonymous === false,
  });
  const siteName = runtimeConfig.siteName ?? "Yona";
  const features = [
    ["yobicon-cgicenter", t("title.unlimitedProjects"), t("site.features.unlimitedProjects")],
    ["yobicon-code", t("title.codeManagement"), t("site.features.codeManagement")],
    ["yobicon-articles", t("title.issueTracker"), t("site.features.issueTracker")],
    ["yobicon-lock", t("title.privateProject"), t("site.features.privateRepositories")],
    ["yobicon-preview", t("title.codeReview"), t("site.features.codeReview")],
    ["yobicon-friends", t("title.workTeam"), t("site.features.workTeam")],
  ];
  const isAuthenticated = sessionQuery.data?.isAnonymous === false;

  if (isAuthenticated) {
    return (
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <div className="page-wrap-outer">
          <div className="page-wrap">
            <div className="site-guide-outer hide">
              <h3>
                <span>{`${t("app.welcome", { args: [siteName] })} - ${t("app.description")}`}</span>
              </h3>
              <table className="welcome-table table borderless">
                <tbody>
                  <tr>
                    <td>
                      <a
                        href={prefixBasePath(runtimeConfig.basePath, "/projects/new")}
                        className="ybtn ybtn-success"
                      >
                        {t("button.newProject")}
                      </a>
                    </td>
                    <td>{t("app.welcome.project.desc")}</td>
                  </tr>
                  <tr>
                    <td>
                      <a
                        href={prefixBasePath(runtimeConfig.basePath, "/organizations/new")}
                        className="ybtn ybtn-success"
                      >
                        {t("title.newOrganization")}
                      </a>
                    </td>
                    <td>{t("app.welcome.group.desc")}</td>
                  </tr>
                  <tr>
                    <td>
                      <a
                        href={prefixBasePath(runtimeConfig.basePath, "/projects")}
                        className="ybtn ybtn-success"
                      >
                        {t("title.projectList")}
                      </a>
                    </td>
                    <td>{t("app.welcome.searchProject.desc")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="guide-toggle">
              <button className="btn-transparent" id="toggleIntro" type="button">
                <i className="yobicon-resizev" />
              </button>
            </div>
            <div className="page on-fold-intro">
              <div className="row-fluid content-container">
                <div className="span8 main-stream">
                  <ul className="nav nav-tabs">
                    <li className="active">
                      <a href={prefixBasePath(runtimeConfig.basePath, "/notifications")}>
                        {t("notification")}
                      </a>
                    </li>
                    <li>
                      <a href={prefixBasePath(runtimeConfig.basePath, "/issues")}>
                        {t("issue.myIssue")}
                      </a>
                    </li>
                    <li>
                      <a href={prefixBasePath(runtimeConfig.basePath, "/user/files")}>
                        {t("user.files")}
                      </a>
                    </li>
                    <li />
                  </ul>
                  <ul className="activity-streams notification-wrap unstyled">
                    {(notificationsQuery.data?.items.length ?? 0) === 0 ? (
                      <div className="warning-none">
                        <i className="yobicon-danger" />
                        {t("notification.none")}
                      </div>
                    ) : null}
                  </ul>
                </div>
                <div className="span4 index-menu right-menu span-hard-wrap" />
              </div>
            </div>
          </div>
        </div>
      </SiteLayoutShell>
    );
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <div className="siteintro-bg row">
        <div className="siteintro">
          <div className="siteintro-cover">
            <div className="siteintro-wrap">
              <h1 className="site-heading">21st Century Software Development Platform</h1>
              <ul className="site-features">
                <li>Just focus on what you have to do</li>
              </ul>
            </div>
            <div className="signup-btn">
              <Link
                to="/users/signupform"
                className="ybtn ybtn-success ybtn-padding"
                activeOptions={{ exact: true }}
              >
                {t("button.signup", { args: [siteName] })}
              </Link>
            </div>
          </div>
        </div>
        <div className="feature">
          <h2>
            <span>{t("title.features")}</span>
          </h2>
          <ul className="feature-wrap row">
            {features.map(([iconClassName, title, description]) => (
              <li key={iconClassName}>
                <div className="feature-image">
                  <i className={iconClassName} />
                </div>
                <div className="feature-info">
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-desc">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function SiteLayoutShell({
  children,
  runtimeConfig,
}: {
  children: React.ReactNode;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <>
      <div className="unsupported hidden">
        <div className="unsupported-inner">
          <p id="unsupported-content" />
        </div>
      </div>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <div className="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
            <i className="yobicon-arrow-left" />
            <i className="yobicon-arrow-right" />
          </div>
          <ul className="gnb-nav">
            <li>
              <a href={prefixBasePath(runtimeConfig.basePath, "/")} className="logo logo-letter">
                Y
              </a>
            </li>
            <li>
              <form
                action={prefixBasePath(runtimeConfig.basePath, "/search")}
                className="input-prepend gnb-search-form"
                name="gnb-search-form"
              >
                <input type="hidden" name="searchType" value="auto" />
                <div className="search-box">
                  <input type="text" name="keyword" autoComplete="off" />
                  <button type="submit">
                    <i className="yobicon-search" />
                  </button>
                </div>
              </form>
            </li>
          </ul>
        </div>
      </header>
      {children}
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Copyright{" "}
            <a
              href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
              target="_blank"
              className="yona-author"
            >
              Yona authors
            </a>
            {" & © "}
            <a href="https://navercorp.com" target="_blank">
              NAVER Corp.
            </a>
            {" & "}
            <a href="https://naverlabs.com/" target="_blank" className="naver-labs">
              NAVER LABS
            </a>{" "}
            Supported by{" "}
            <a
              href="https://www.ncloud.com/?referer=yona"
              target="_blank"
              className="naver-cloud-platform"
            >
              NAVER CLOUD PLATFORM
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
