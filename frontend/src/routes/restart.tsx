import { Link, createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";

export const Route = createFileRoute("/restart")({
  component: RestartRoute,
});

function RestartRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <RestartScreen siteName={runtimeConfig.siteName ?? "Yona"} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function RestartScreen({ siteName }: { siteName: string }) {
  const { t } = useLegacyMessages();

  return (
    <>
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap">
              <Link to="/" className="logo">
                <span>{siteName}</span>
              </Link>

              <h3>{t("app.restart.welcome")}</h3>
              <p className="secret-box txt-center">{t("app.restart.notice")}</p>
            </div>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Powered by <strong>{siteName}</strong>
          </span>
        </div>
      </footer>
    </>
  );
}
