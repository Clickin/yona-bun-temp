import * as stylex from "@stylexjs/stylex";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { restartTheme } from "./-restart.stylex";

const legacyLogoLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

const styles = stylex.create({
  restartNotice: {
    "--yoram-stylex-restart-notice": "stylex",
  },
  wrap: {
    padding: "50px 0px",
    textAlign: "center",
  },
  logo: {
    display: "block",
    textAlign: "center",
    overflow: "hidden",
    width: "123px",
    height: "55px",
    lineHeight: "55px",
    fontSize: "2em",
    color: restartTheme.logoText,
    backgroundColor: restartTheme.logoSurface,
    margin: "50px auto",
    ":hover": { color: restartTheme.logoText },
  },
  box: {
    width: "50%",
    margin: "20px auto",
  },
});

const restartNoticeClassName = stylex.props(styles.restartNotice).className;
const restartWrapClassName = stylex.props(styles.wrap).className;
const restartLogoClassName = stylex.props(styles.logo).className;
const restartBoxClassName = stylex.props(styles.box).className;

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
      <div className="page-wrap-outer" data-stylex-owner="restart-page">
        <div className="container page-wrap" data-stylex-owner="restart-shell">
          <div className="page">
            <div
              className={`secret-wrap ${restartNoticeClassName} ${restartWrapClassName}`}
              data-stylex-owner="restart-notice"
              data-stylex-part="restart-notice-wrap"
            >
              <Link
                to="/"
                activeOptions={{ exact: true, explicitUndefined: true }}
                activeProps={legacyLogoLinkActiveProps}
                className={`logo ${restartLogoClassName}`}
                data-stylex-part="restart-notice-logo"
              >
                <span>{siteName}</span>
              </Link>

              <h3 data-stylex-part="restart-notice-heading">{t("app.restart.welcome")}</h3>
              <p
                className={`secret-box txt-center ${restartBoxClassName}`}
                data-stylex-part="restart-notice-copy"
              >
                {t("app.restart.notice")}
                {hasFailedToUpdateSecret ? t("app.restart.updateSecretYourself") : null}
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer" data-stylex-owner="restart-footer">
        <div className="page-footer">
          <span className="provider">
            Powered by <strong>{siteName}</strong>
          </span>
        </div>
      </footer>
    </>
  );
}
