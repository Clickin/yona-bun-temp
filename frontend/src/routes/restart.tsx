import { Link, createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";

const legacyLogoLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/restart")({
  component: RestartRoute,
  validateSearch(search: Record<string, unknown>) {
    return {
      hasFailedToUpdateSecret:
        search.hasFailedToUpdateSecret === true || search.hasFailedToUpdateSecret === "true",
    };
  },
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
  const { hasFailedToUpdateSecret } = Route.useSearch();
  const { t } = useLegacyMessages();

  return (
    <>
      <title>{t("app.restart.welcome")}</title>
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap">
              <Link
                to="/"
                activeOptions={{ exact: true, explicitUndefined: true }}
                activeProps={legacyLogoLinkActiveProps}
                className="logo"
              >
                <span>{siteName}</span>
              </Link>

              <h3>{t("app.restart.welcome")}</h3>
              <p className="secret-box txt-center">
                {t("app.restart.notice")}
                {hasFailedToUpdateSecret ? t("app.restart.updateSecretYourself") : null}
              </p>
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
