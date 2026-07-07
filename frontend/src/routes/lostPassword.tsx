import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { apiQueryKeys } from "../api/query-keys";
import { currentSessionQueryOptions } from "../api/session";
import { readSessionBootstrap, requestPasswordReset } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import type { RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type LostPasswordSearch = {
  error: string;
  requested: string;
};

export const Route = createFileRoute("/lostPassword")({
  component: LostPasswordRoute,
  validateSearch: (search: Record<string, unknown>): LostPasswordSearch => ({
    error: search.error == null ? "" : String(search.error),
    requested: search.requested == null ? "" : String(search.requested),
  }),
});

function LostPasswordRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <LostPasswordScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function LostPasswordScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { error, requested } = Route.useSearch();
  const { language, t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const [submitError, setSubmitError] = React.useState("");
  const siteName = runtimeConfig.siteName ?? "Yona";
  const browserTitle = t("site.resetPasswordEmail.title");
  const title = lookupLegacyMessage(language, "title.resetPasswordFor", {
    args: [siteName],
  });
  const isSent = requested !== "";
  const errorMessage = error ? lostPasswordErrorMessage(error, t) : submitError;
  const [isSuccessAlertDismissed, setIsSuccessAlertDismissed] = React.useState(false);
  const [isErrorAlertDismissed, setIsErrorAlertDismissed] = React.useState(false);
  const shouldPrefillCurrentUser = sessionQuery.data?.isAnonymous === false;
  const currentUserLoginId =
    shouldPrefillCurrentUser && typeof sessionQuery.data?.loginId === "string"
      ? sessionQuery.data.loginId
      : "";
  const currentUserEmail =
    shouldPrefillCurrentUser && typeof sessionQuery.data?.emailAddress === "string"
      ? sessionQuery.data.emailAddress
      : "";
  const requestMutation = useMutation({
    mutationFn: async (input: { emailAddress: string; loginId: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return requestPasswordReset(runtimeConfig, csrfToken, input);
    },
    onError(errorValue) {
      setSubmitError(
        errorValue instanceof Error
          ? t(errorValue.message, { fallback: errorValue.message })
          : t("site.resetPasswordEmail.invalidRequest"),
      );
    },
    async onSuccess(response) {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.session() });
      const redirectPath =
        typeof response.redirectPath === "string"
          ? response.redirectPath
          : "/lostPassword?requested=1";
      router.history.push(redirectPath);
    },
  });
  React.useEffect(() => {
    setIsSuccessAlertDismissed(false);
    setIsErrorAlertDismissed(false);
  }, [error, requested]);

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <title>{browserTitle}</title>
      <div className="page full">
        <div className="center-wrap tag-line-wrap reset-password">
          <h1 className="title">
            <HighlightedLegacyMessage message={title} />
          </h1>
          <p className="tag-line">{t("app.description")}</p>
        </div>

        <div className="login-form-wrap frm-wrap">
          {isSent && !isSuccessAlertDismissed ? (
            <div className="alert alert-success">
              <button
                type="button"
                className="close"
                data-dismiss="alert"
                onClick={() => setIsSuccessAlertDismissed(true)}
              >
                &times;
              </button>
              <h4>{t("site.mail.sended")}</h4>
            </div>
          ) : null}

          {errorMessage && !isErrorAlertDismissed ? (
            <div className="alert alert-error">
              <button
                type="button"
                className="close"
                data-dismiss="alert"
                onClick={() => setIsErrorAlertDismissed(true)}
              >
                &times;
              </button>
              <h4>{t("site.mail.fail")}</h4>
              {errorMessage}
            </div>
          ) : null}

          <form
            key={`${currentUserLoginId}:${currentUserEmail}`}
            method="post"
            action="/lostPassword"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <dl>
              <dd>
                <input
                  type="text"
                  id="loginId"
                  name="loginId"
                  required
                  placeholder={t("user.loginId")}
                  className="text"
                  {...(shouldPrefillCurrentUser ? { defaultValue: currentUserLoginId } : {})}
                />
              </dd>
              <dd>
                <input
                  type="text"
                  id="emailAddress"
                  name="emailAddress"
                  required
                  placeholder={t("user.email")}
                  className="text"
                  {...(shouldPrefillCurrentUser ? { defaultValue: currentUserEmail } : {})}
                />
              </dd>
            </dl>

            <div className="btns-row">
              <button
                type="submit"
                className="ybtn ybtn-primary ybtn-large ybtn-fullsize"
                disabled={requestMutation.isPending}
              >
                {t("button.confirm")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SiteLayoutShell>
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    const form = new FormData(event.currentTarget);
    requestMutation.mutate({
      emailAddress: String(form.get("emailAddress") ?? ""),
      loginId: String(form.get("loginId") ?? ""),
    });
  }
}

function lostPasswordErrorMessage(error: string, t: ReturnType<typeof useLegacyMessages>["t"]) {
  return t(error === "invalid" ? "site.resetPasswordEmail.invalidRequest" : error, {
    fallback: error,
  });
}

function HighlightedLegacyMessage({ message }: { message: string }) {
  const match = /^(.*)<span class="highlight">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return <>{message}</>;
  }

  return (
    <>
      {match[1]}
      <span className="highlight">{match[2]}</span>
      {match[3]}
    </>
  );
}
