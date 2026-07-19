import { Outlet, createFileRoute } from "@tanstack/react-router";
import { readCurrentSessionRest } from "../api/session";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { SiteLayoutShell } from "./-home-route-screen";
import { DefaultSearchErrorBody } from "./-search-screen";

class SiteAdminForbiddenError extends Error {}

export const Route = createFileRoute("/sites")({
  beforeLoad: async ({ context }) => {
    const session = await readCurrentSessionRest(context.runtimeConfig);
    if (session.isAnonymous || !session.isSiteAdmin) {
      throw new SiteAdminForbiddenError();
    }
  },
  component: Outlet,
  errorComponent: SiteAdminForbiddenBoundary,
});

function SiteAdminForbiddenBoundary() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteAdminForbiddenScreen />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteAdminForbiddenScreen() {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const messageKey = "error.auth.unauthorized.waringMessage";

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <title>{t(messageKey)}</title>
      <DefaultSearchErrorBody
        iconClassName="ico ico-err2"
        messageKey={messageKey}
        runtimeConfig={runtimeConfig}
      />
    </SiteLayoutShell>
  );
}
