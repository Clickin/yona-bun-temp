import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { verifyUser } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/verify/$loginId/$verificationCode")({
  component: VerifyUserRoute,
});

function VerifyUserRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <VerifyUserScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function VerifyUserScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { loginId, verificationCode } = Route.useParams();
  const { t } = useLegacyMessages();
  const legacyBrowserTitle = "";
  const verificationQuery = useQuery({
    queryKey: ["auth", "verify", loginId, verificationCode],
    queryFn: () =>
      verifyUser(runtimeConfig, {
        loginId,
        verificationCode,
      }),
    retry: false,
  });

  if (verificationQuery.isError) {
    return <>Invalid verification</>;
  }

  if (!verificationQuery.data) {
    return (
      <>
        <title>{legacyBrowserTitle}</title>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <div className="page full">
            <div className="center-wrap tag-line-wrap reset-password">
              <p className="tag-line">{t("common.loading")}</p>
            </div>
          </div>
        </SiteLayoutShell>
      </>
    );
  }

  const verifiedLoginId =
    typeof verificationQuery.data.loginId === "string" ? verificationQuery.data.loginId : loginId;

  return (
    <>
      <title>{legacyBrowserTitle}</title>
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <div className="page full">
          <div
            className="center-wrap tag-line-wrap reset-password"
            data-owner="verified-user-success"
          >
            <h1 className="title">{t("user.verified")}</h1>
            <p>{verifiedLoginId}</p>
            <hr />
            <p className="tag-line">{t("user.verified.detail")}</p>
          </div>
        </div>
      </SiteLayoutShell>
    </>
  );
}
