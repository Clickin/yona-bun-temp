import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../api/session";
import { readSessionBootstrap, requestPasswordReset } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type LostPasswordSearch = {
  error?: string;
  requested?: number;
};
export const Route = createFileRoute("/lostPassword")({
  component: LostPasswordRoute,
  validateSearch: (search: Record<string, unknown>): LostPasswordSearch => {
    const error = search.error == null ? "" : String(search.error);
    const requested = search.requested == null ? "" : String(search.requested);
    return {
      ...(error === "" ? {} : { error }),
      ...(requested === "" ? {} : { requested: 1 }),
    };
  },
});

function LostPasswordRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <LostPasswordScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function LostPasswordScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { error, requested } = Route.useSearch();
  const { language, t } = useLegacyMessages();
  const navigate = useNavigate();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const [submitError, setSubmitError] = React.useState("");
  const siteName = runtimeConfig.siteName ?? "Yoram";
  const browserTitle = t("site.resetPasswordEmail.title");
  const title = lookupLegacyMessage(language, "title.resetPasswordFor", {
    args: [siteName],
  });
  const isSent = requested !== undefined;
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
  const anonymousBaseline = sessionQuery.data?.isAnonymous === true && !isSent && !errorMessage;
  const authenticatedNoAlert = sessionQuery.data?.isAnonymous === false && !isSent && !errorMessage;
  const anonymousRequestedSuccess =
    sessionQuery.data?.isAnonymous === true && isSent && !errorMessage && !isSuccessAlertDismissed;
  const authenticatedRequestedSuccess =
    sessionQuery.data?.isAnonymous === false && isSent && !errorMessage && !isSuccessAlertDismissed;
  const anonymousVisibleError =
    sessionQuery.data?.isAnonymous === true && Boolean(errorMessage) && !isErrorAlertDismissed;
  const authenticatedVisibleError =
    sessionQuery.data?.isAnonymous === false && Boolean(errorMessage) && !isErrorAlertDismissed;
  // Requesting a reset email does not change cached session or auth state.
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
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
    async onSuccess() {
      await navigate({ to: "/lostPassword", search: { requested: 1 } });
    },
  });
  React.useEffect(() => {
    setIsSuccessAlertDismissed(false);
    setIsErrorAlertDismissed(false);
  }, [error, requested]);

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <title>{browserTitle}</title>
      <div
        className={
          anonymousBaseline ? `page full ` : authenticatedNoAlert ? `page full ` : "page full"
        }
        data-owner={
          anonymousBaseline
            ? "lost-password-form"
            : authenticatedNoAlert
              ? "lost-password-authenticated-prefill"
              : undefined
        }
      >
        <div
          className={"center-wrap tag-line-wrap reset-password"}
          data-part={
            anonymousBaseline
              ? "lost-password-tagline"
              : authenticatedNoAlert
                ? "lost-password-authenticated-prefill-tagline"
                : undefined
          }
        >
          <h1
            className={"title"}
            data-part={
              anonymousBaseline
                ? "lost-password-title"
                : authenticatedNoAlert
                  ? "lost-password-authenticated-prefill-title"
                  : undefined
            }
          >
            <HighlightedLegacyMessage message={title} />
          </h1>
          <p
            className={"tag-line"}
            data-part={
              anonymousBaseline
                ? "lost-password-copy"
                : authenticatedNoAlert
                  ? "lost-password-authenticated-prefill-copy"
                  : undefined
            }
          >
            {t("app.description")}
          </p>
        </div>

        <div
          className={"login-form-wrap frm-wrap"}
          data-part={
            anonymousBaseline
              ? "lost-password-form-wrap"
              : authenticatedNoAlert
                ? "lost-password-authenticated-prefill-form-wrap"
                : undefined
          }
        >
          {isSent && !isSuccessAlertDismissed ? (
            <div
              data-owner={
                anonymousRequestedSuccess
                  ? "lost-password-success-alert"
                  : authenticatedRequestedSuccess
                    ? "lost-password-authenticated-success-alert"
                    : undefined
              }
            >
              <button
                type="button"
                data-part={
                  anonymousRequestedSuccess
                    ? "lost-password-success-alert-dismiss"
                    : authenticatedRequestedSuccess
                      ? "lost-password-authenticated-success-alert-dismiss"
                      : undefined
                }
                onClick={() => setIsSuccessAlertDismissed(true)}
              >
                &times;
              </button>
              <h4
                data-part={
                  anonymousRequestedSuccess
                    ? "lost-password-success-alert-heading"
                    : authenticatedRequestedSuccess
                      ? "lost-password-authenticated-success-alert-heading"
                      : undefined
                }
              >
                {t("site.mail.sended")}
              </h4>
            </div>
          ) : null}

          {errorMessage && !isErrorAlertDismissed ? (
            <div
              data-owner={
                anonymousVisibleError
                  ? "lost-password-error-alert"
                  : authenticatedVisibleError
                    ? "lost-password-authenticated-error-alert"
                    : undefined
              }
            >
              <button
                type="button"
                data-part={
                  anonymousVisibleError
                    ? "lost-password-error-alert-dismiss"
                    : authenticatedVisibleError
                      ? "lost-password-authenticated-error-alert-dismiss"
                      : undefined
                }
                onClick={() => setIsErrorAlertDismissed(true)}
              >
                &times;
              </button>
              <h4
                data-part={
                  anonymousVisibleError
                    ? "lost-password-error-alert-heading"
                    : authenticatedVisibleError
                      ? "lost-password-authenticated-error-alert-heading"
                      : undefined
                }
              >
                {t("site.mail.fail")}
              </h4>
              {errorMessage}
            </div>
          ) : null}

          <form
            key={`${currentUserLoginId}:${currentUserEmail}`}
            method="post"
            action={prefixBasePath(runtimeConfig.basePath, "/lostPassword")}
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
                  data-owner="lost-password-login-id"
                  data-part={
                    anonymousBaseline
                      ? "lost-password-login-id"
                      : authenticatedNoAlert
                        ? "lost-password-authenticated-prefill-login-id"
                        : undefined
                  }
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
                  data-owner="lost-password-email"
                  data-part={
                    anonymousBaseline
                      ? "lost-password-email"
                      : authenticatedNoAlert
                        ? "lost-password-authenticated-prefill-email"
                        : undefined
                  }
                  {...(shouldPrefillCurrentUser ? { defaultValue: currentUserEmail } : {})}
                />
              </dd>
            </dl>

            <div
              className={"btns-row"}
              data-part={
                anonymousBaseline
                  ? "lost-password-submit-row"
                  : authenticatedNoAlert
                    ? "lost-password-authenticated-prefill-submit-row"
                    : undefined
              }
            >
              <button
                type="submit"
                className={"ybtn ybtn-primary ybtn-large ybtn-fullsize"}
                data-part={
                  anonymousBaseline
                    ? "lost-password-submit"
                    : authenticatedNoAlert
                      ? "lost-password-authenticated-prefill-submit"
                      : undefined
                }
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
      <span className={"highlight"}>{match[2]}</span>
      {match[3]}
    </>
  );
}
