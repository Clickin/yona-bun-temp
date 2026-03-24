import * as React from "react";
import { QueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { AppAuthCaller } from "@app/lib/auth-client";
import { I18nProvider, useI18n } from "@app/lib/i18n-react";
import { readCurrentLocale } from "@app/lib/locale";
import { currentSessionQueryOptions } from "@app/lib/queries";
import { translateMessage } from "@yona/i18n";
import appCss from "../styles/app.css?url";

interface AppRouterContext {
  authCaller: AppAuthCaller;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  loader: async ({ context }) => {
    const [, locale] = await Promise.all([
      context.queryClient.ensureQueryData(currentSessionQueryOptions(context.authCaller)),
      readCurrentLocale(),
    ]);

    return locale;
  },
  head: () => ({
    links: appCss ? [{ rel: "stylesheet", href: appCss }] : [],
  }),
  component: RootRouteComponent,
  notFoundComponent: NotFoundRouteComponent,
});

function RootRouteComponent() {
  return (
    <AppDocument>
      <Outlet />
      <TanStackRouterDevtools position="bottom-left" />
    </AppDocument>
  );
}

function NotFoundRouteComponent() {
  return (
    <AppDocument>
      <NotFoundPage />
    </AppDocument>
  );
}

function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="app-shell">
      <main className="app-page not-found-page">
        <p className="page-eyebrow">{t("app.notFound.eyebrow")}</p>
        <h1>{t("app.notFound.title")}</h1>
        <p className="page-summary">{t("app.notFound.summary")}</p>
      </main>
    </div>
  );
}

function AppDocument({ children }: { children: React.ReactNode }) {
  const { locale } = Route.useLoaderData();

  return (
    <I18nProvider locale={locale}>
      <RootDocument locale={locale}>{children}</RootDocument>
    </I18nProvider>
  );
}

function RootDocument({ children, locale }: { children: React.ReactNode; locale: string }) {
  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <title>{translateMessage(locale, "app.name")}</title>
        <meta name="description" content={translateMessage(locale, "app.meta.description")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
