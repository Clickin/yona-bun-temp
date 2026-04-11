import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useI18n } from "@app/lib/i18n-react";
import { currentSessionQueryOptions } from "@app/lib/queries";

const localeLinkTargets = ["en", "ko-KR"] as const;

function buildLocaleHref(currentHref: string | undefined, locale: (typeof localeLinkTargets)[number]) {
  const url = new URL(currentHref ?? "/", "http://yona.local");
  url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

export const Route = createFileRoute("/_app")({
  component: AppLayoutRouteComponent,
});

function AppLayoutRouteComponent() {
  const router = useRouter();
  const currentHref = useRouterState({
    select: (state) => state.location.href,
  });
  const session = useSuspenseQuery(currentSessionQueryOptions(router.options.context.authCaller));
  const { locale, t } = useI18n();

  return (
    <div className="app-shell">
      <header className="app-navbar">
        <div className="app-navbar-inner">
          <div className="app-brand-wrap">
            <Link className="app-brand" to="/">
              {t("app.name")}
            </Link>
            <p className="app-brand-copy">{t("app.brandCopy")}</p>
          </div>
          <nav aria-label={t("app.nav.global")} className="app-nav">
            <Link to="/" activeProps={{ className: "app-nav-link is-active" }} className="app-nav-link">
              {t("app.nav.home")}
            </Link>
            <a href="/search?pageSize=20&scope=global" className="app-nav-link">
              {t("title.search")}
            </a>
            {session.data.isAnonymous ? null : (
              <Link
                to="/me"
                activeProps={{ className: "app-nav-link is-active" }}
                className="app-nav-link"
              >
                {t("app.nav.workspace")}
              </Link>
            )}
          </nav>
          <form action="/search" className="app-search-form" method="get">
            <input name="scope" type="hidden" value="global" />
            <input name="pageSize" type="hidden" value="20" />
            <input
              aria-label={t("site.search")}
              name="query"
              placeholder={t("site.search")}
              type="search"
            />
            <button type="submit">{t("title.search")}</button>
          </form>
          <div className="app-user-links">
            <nav aria-label={t("app.locale.label")} className="app-locale-switch">
              {localeLinkTargets.map((targetLocale) => (
                <a
                  aria-current={locale === targetLocale ? "true" : undefined}
                  className={locale === targetLocale ? "app-locale-link is-active" : "app-locale-link"}
                  href={buildLocaleHref(currentHref, targetLocale)}
                  key={targetLocale}
                >
                  {targetLocale === "en" ? t("app.locale.en") : t("app.locale.ko")}
                </a>
              ))}
            </nav>
            {session.data.isAnonymous ? (
              <>
                <Link to="/login" className="app-user-link">
                  {t("button.login")}
                </Link>
                <Link to="/register" className="app-user-link app-user-link--strong">
                  {t("button.signup", t("app.name"))}
                </Link>
              </>
            ) : (
              <>
                <Link to="/me" className="app-user-link">
                  {session.data.userLabel ?? session.data.loginId ?? t("app.nav.workspace")}
                </Link>
                <Link to="/me/settings" className="app-user-link">
                  {t("app.nav.settings")}
                </Link>
                <Link to="/projects/new" className="app-user-link">
                  {t("title.newProject")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="app-page">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>{t("app.footer.runtime")}</span>
          <span>{t("app.footer.activeRuntime")}</span>
        </div>
      </footer>
    </div>
  );
}
