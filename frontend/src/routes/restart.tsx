import type { ComponentPropsWithoutRef } from "react";
import { createFileRoute, useLinkProps, useRouter } from "@tanstack/react-router";
import { jsx as reactJsx } from "react/jsx-runtime";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";

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
  const logoLinkProps = useLinkProps({
    className: "logo",
    href: basePath,
    onClick: (event) => {
      event.preventDefault();
      router.history.push(basePath);
    },
    to: "/",
  });

  return (
    <>
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap">
              <LegacyHrefAnchor {...logoLinkProps} legacyHref={basePath}>
                <span>{siteName}</span>
              </LegacyHrefAnchor>

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

function LegacyHrefAnchor({
  children,
  legacyHref,
  href: _href,
  ...props
}: ComponentPropsWithoutRef<"a"> & { legacyHref: string }) {
  return reactJsx("a", {
    ...props,
    href: legacyHref,
    children,
  });
}
