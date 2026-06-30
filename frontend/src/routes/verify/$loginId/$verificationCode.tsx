import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { verifyUser } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";

export const Route = createFileRoute("/verify/$loginId/$verificationCode")({
  component: VerifyUserRoute,
});

function VerifyUserRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <VerifyUserScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function VerifyUserScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { loginId, verificationCode } = Route.useParams();
  const { t } = useLegacyMessages();
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
    return <>{t("common.loading")}</>;
  }

  const verifiedLoginId =
    typeof verificationQuery.data.loginId === "string" ? verificationQuery.data.loginId : loginId;

  return (
    <div className="page full">
      <div className="center-wrap tag-line-wrap reset-password">
        <h1 className="title">{t("user.verified")}</h1>
        <p>{verifiedLoginId}</p>
        <hr />
        <p className="tag-line">{t("user.verified.detail")}</p>
      </div>
    </div>
  );
}
