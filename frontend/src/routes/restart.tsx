import * as React from "react";
import { createFileRoute, createLink, useRouter } from "@tanstack/react-router";
import { jsx as reactJsx } from "react/jsx-runtime";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";

const legacyLogoLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

function LegacyLogoLinkAnchor({
  legacyHref,
  href: _href,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & {
  legacyHref: string;
  ref?: React.Ref<HTMLAnchorElement>;
}) {
  return reactJsx("a", { ...props, ref, href: legacyHref });
}

const LegacyLogoLink = createLink(LegacyLogoLinkAnchor);

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
        <RestartScreen
          basePath={runtimeConfig.basePath}
          siteName={runtimeConfig.siteName ?? "Yona"}
        />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function RestartScreen({ basePath, siteName }: { basePath: string; siteName: string }) {
  const { hasFailedToUpdateSecret } = Route.useSearch();
  const { t } = useLegacyMessages();
  const router = useRouter();
  const handleLogoClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      router.history.push(basePath);
    },
    [basePath, router.history],
  );

  return (
    <>
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap">
              <LegacyLogoLink
                href={basePath}
                legacyHref={basePath}
                to="/"
                activeProps={legacyLogoLinkActiveProps}
                className="logo"
                onClick={handleLogoClick}
              >
                <span>{siteName}</span>
              </LegacyLogoLink>

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
