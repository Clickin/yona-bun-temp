import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../api/session";
import { readSessionBootstrap, requestPasswordReset } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { lostPasswordTheme } from "./-lostPassword.stylex";
import { SiteLayoutShell } from "./-home-route-screen";

type LostPasswordSearch = {
  error?: string;
  requested?: number;
};

const styles = stylex.create({
  anonymousBaseline: {
    "--yoram-stylex-lost-password": "stylex",
  },
  authenticatedPrefill: {
    "--yoram-stylex-lost-password-authenticated-prefill": "stylex",
  },
  taglineWrap: {
    textAlign: "center",
    marginTop: "0px",
    marginBottom: "26px",
    paddingTop: "80px",
  },
  title: {
    display: "inline-block",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "3.3em",
    lineHeight: "42px",
    fontWeight: "400",
  },
  tagline: {
    marginTop: "10px",
    fontSize: "1.2em",
    color: lostPasswordTheme.taglineText,
  },
  formWrap: {
    position: "relative",
    width: {
      default: "400px",
      "@media (max-width: 767px)": "95%",
    },
    margin: "54px auto 0px",
  },
  textInput: {
    width: {
      default: "386px",
      "@media (max-width: 767px)": "95%",
    },
    height: "27px",
    marginBottom: "10px",
    fontSize: "12px",
    fontWeight: "700",
    borderStyle: "none",
    borderBottomColor: lostPasswordTheme.inputBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderRadius: "0px",
    ":focus": {
      borderBottomColor: lostPasswordTheme.inputFocusBorder,
      outline: "none",
      boxShadow: "none",
    },
  },
  buttonRow: {
    display: "block",
    textAlign: "center",
    margin: "0px auto 20px",
  },
  submit: {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
  },
  successAlert: {
    padding: "8px 35px 8px 14px",
    marginBottom: "20px",
    textShadow: lostPasswordTheme.alertTextShadow,
    backgroundColor: lostPasswordTheme.successSurface,
    borderColor: lostPasswordTheme.successBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "4px",
    color: lostPasswordTheme.successText,
  },
  successAlertHeading: {
    margin: "0px",
    fontSize: "15px",
    color: lostPasswordTheme.successText,
  },
  successAlertDismiss: {
    float: "right",
    position: "relative",
    top: "-2px",
    right: "-21px",
    padding: "0px",
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "20px",
    color: lostPasswordTheme.dismissText,
    textShadow: lostPasswordTheme.dismissTextShadow,
    opacity: "0.2",
    cursor: "pointer",
    backgroundColor: lostPasswordTheme.dismissSurface,
    borderStyle: "none",
    borderWidth: "0px",
    appearance: "none",
    ":hover": {
      color: lostPasswordTheme.dismissText,
      textDecoration: "none",
      cursor: "pointer",
      opacity: "0.4",
    },
    ":focus": {
      color: lostPasswordTheme.dismissText,
      textDecoration: "none",
      cursor: "pointer",
      opacity: "0.4",
    },
  },
  errorAlert: {
    padding: "8px 35px 8px 14px",
    marginBottom: "20px",
    textShadow: lostPasswordTheme.alertTextShadow,
    backgroundColor: lostPasswordTheme.errorSurface,
    borderColor: lostPasswordTheme.errorBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "4px",
    color: lostPasswordTheme.errorText,
  },
  errorAlertHeading: {
    margin: "0px",
    fontSize: "15px",
    color: lostPasswordTheme.errorText,
  },
  errorAlertDismiss: {
    float: "right",
    position: "relative",
    top: "-2px",
    right: "-21px",
    padding: "0px",
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "20px",
    color: lostPasswordTheme.dismissText,
    textShadow: lostPasswordTheme.dismissTextShadow,
    opacity: "0.2",
    cursor: "pointer",
    backgroundColor: lostPasswordTheme.dismissSurface,
    borderStyle: "none",
    borderWidth: "0px",
    appearance: "none",
    ":hover": {
      color: lostPasswordTheme.dismissText,
      textDecoration: "none",
      cursor: "pointer",
      opacity: "0.4",
    },
    ":focus": {
      color: lostPasswordTheme.dismissText,
      textDecoration: "none",
      cursor: "pointer",
      opacity: "0.4",
    },
  },
});

const anonymousBaselineClassName = stylex.props(styles.anonymousBaseline).className;
const authenticatedPrefillClassName = stylex.props(styles.authenticatedPrefill).className;
const taglineWrapClassName = stylex.props(styles.taglineWrap).className;
const titleClassName = stylex.props(styles.title).className;
const taglineClassName = stylex.props(styles.tagline).className;
const formWrapClassName = stylex.props(styles.formWrap).className;
const textInputClassName = stylex.props(styles.textInput).className;
const buttonRowClassName = stylex.props(styles.buttonRow).className;
const submitClassName = stylex.props(styles.submit).className;
const successAlertClassName = stylex.props(styles.successAlert).className;
const successAlertHeadingClassName = stylex.props(styles.successAlertHeading).className;
const successAlertDismissClassName = stylex.props(styles.successAlertDismiss).className;
const errorAlertClassName = stylex.props(styles.errorAlert).className;
const errorAlertHeadingClassName = stylex.props(styles.errorAlertHeading).className;
const errorAlertDismissClassName = stylex.props(styles.errorAlertDismiss).className;

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
  const stylexFormState = anonymousBaseline || authenticatedNoAlert;
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
          anonymousBaseline
            ? `page full ${anonymousBaselineClassName}`
            : authenticatedNoAlert
              ? `page full ${authenticatedPrefillClassName}`
              : "page full"
        }
        data-stylex-owner={
          anonymousBaseline
            ? "lost-password-form"
            : authenticatedNoAlert
              ? "lost-password-authenticated-prefill"
              : undefined
        }
      >
        <div
          className={
            stylexFormState
              ? `center-wrap tag-line-wrap reset-password ${taglineWrapClassName}`
              : "center-wrap tag-line-wrap reset-password"
          }
          data-stylex-part={
            anonymousBaseline
              ? "lost-password-tagline"
              : authenticatedNoAlert
                ? "lost-password-authenticated-prefill-tagline"
                : undefined
          }
        >
          <h1
            className={stylexFormState ? `title ${titleClassName}` : "title"}
            data-stylex-part={
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
            className={stylexFormState ? `tag-line ${taglineClassName}` : "tag-line"}
            data-stylex-part={
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
          className={
            stylexFormState
              ? `login-form-wrap frm-wrap ${formWrapClassName}`
              : "login-form-wrap frm-wrap"
          }
          data-stylex-part={
            anonymousBaseline
              ? "lost-password-form-wrap"
              : authenticatedNoAlert
                ? "lost-password-authenticated-prefill-form-wrap"
                : undefined
          }
        >
          {isSent && !isSuccessAlertDismissed ? (
            anonymousRequestedSuccess || authenticatedRequestedSuccess ? (
              <div
                className={successAlertClassName}
                data-stylex-owner={
                  anonymousRequestedSuccess
                    ? "lost-password-success-alert"
                    : "lost-password-authenticated-success-alert"
                }
              >
                <button
                  type="button"
                  className={successAlertDismissClassName}
                  data-stylex-part={
                    anonymousRequestedSuccess
                      ? "lost-password-success-alert-dismiss"
                      : "lost-password-authenticated-success-alert-dismiss"
                  }
                  onClick={() => setIsSuccessAlertDismissed(true)}
                >
                  &times;
                </button>
                <h4
                  className={successAlertHeadingClassName}
                  data-stylex-part={
                    anonymousRequestedSuccess
                      ? "lost-password-success-alert-heading"
                      : "lost-password-authenticated-success-alert-heading"
                  }
                >
                  {t("site.mail.sended")}
                </h4>
              </div>
            ) : (
              <div className="alert alert-success">
                <button
                  type="button"
                  className="close"
                  onClick={() => setIsSuccessAlertDismissed(true)}
                >
                  &times;
                </button>
                <h4>{t("site.mail.sended")}</h4>
              </div>
            )
          ) : null}

          {errorMessage && !isErrorAlertDismissed ? (
            anonymousVisibleError || authenticatedVisibleError ? (
              <div
                className={errorAlertClassName}
                data-stylex-owner={
                  anonymousVisibleError
                    ? "lost-password-error-alert"
                    : "lost-password-authenticated-error-alert"
                }
              >
                <button
                  type="button"
                  className={errorAlertDismissClassName}
                  data-stylex-part={
                    anonymousVisibleError
                      ? "lost-password-error-alert-dismiss"
                      : "lost-password-authenticated-error-alert-dismiss"
                  }
                  onClick={() => setIsErrorAlertDismissed(true)}
                >
                  &times;
                </button>
                <h4
                  className={errorAlertHeadingClassName}
                  data-stylex-part={
                    anonymousVisibleError
                      ? "lost-password-error-alert-heading"
                      : "lost-password-authenticated-error-alert-heading"
                  }
                >
                  {t("site.mail.fail")}
                </h4>
                {errorMessage}
              </div>
            ) : (
              <div className="alert alert-error">
                <button
                  type="button"
                  className="close"
                  onClick={() => setIsErrorAlertDismissed(true)}
                >
                  &times;
                </button>
                <h4>{t("site.mail.fail")}</h4>
                {errorMessage}
              </div>
            )
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
                  className={stylexFormState ? textInputClassName : "text"}
                  data-stylex-part={
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
                  className={stylexFormState ? textInputClassName : "text"}
                  data-stylex-part={
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
              className={stylexFormState ? `btns-row ${buttonRowClassName}` : "btns-row"}
              data-stylex-part={
                anonymousBaseline
                  ? "lost-password-submit-row"
                  : authenticatedNoAlert
                    ? "lost-password-authenticated-prefill-submit-row"
                    : undefined
              }
            >
              <button
                type="submit"
                className={
                  stylexFormState
                    ? `ybtn ybtn-primary ybtn-large ybtn-fullsize ${submitClassName}`
                    : "ybtn ybtn-primary ybtn-large ybtn-fullsize"
                }
                data-stylex-part={
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
      <span className="highlight">{match[2]}</span>
      {match[3]}
    </>
  );
}
