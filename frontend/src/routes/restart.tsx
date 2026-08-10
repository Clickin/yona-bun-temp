import { Link, createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
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
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <RestartScreen siteName={runtimeConfig.siteName ?? "Yoram"} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function RestartScreen({ siteName }: { siteName: string }) {
  const { hasFailedToUpdateSecret } = Route.useSearch();
  const { t } = useLegacyMessages();

  return (
    <>
      <title>{t("app.restart.welcome")}</title>
      <div className="page-wrap-outer" data-owner="restart-page">
        <div className="container page-wrap" data-owner="restart-shell">
          <div className="page">
            <div
              className={"secret-wrap"}
              data-owner="restart-notice"
              data-part="restart-notice-wrap"
            >
              <Link
                to="/"
                activeOptions={{ exact: true, explicitUndefined: true }}
                activeProps={legacyLogoLinkActiveProps}
                className={"logo"}
                data-part="restart-notice-logo"
              >
                <span>{siteName}</span>
              </Link>

              <h3 data-part="restart-notice-heading">{t("app.restart.welcome")}</h3>
              <p className={"secret-box txt-center"} data-part="restart-notice-copy">
                {t("app.restart.notice")}
                {hasFailedToUpdateSecret ? t("app.restart.updateSecretYourself") : null}
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer" data-owner="restart-footer">
        <div className="page-footer">
          <span className="provider">
            Powered by <strong>{siteName}</strong>
          </span>
        </div>
      </footer>
    </>
  );
}
