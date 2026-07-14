import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../api/session";
import { readSessionBootstrap, requestPasswordReset } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { globalColors } from "../theme.stylex";
import { SiteLayoutShell } from "./-home-route-screen";

type LostPasswordSearch = {
  error?: string;
  requested?: number;
};

const styles = stylex.create({
  anonymousBaseline: {
    "--yoram-stylex-lost-password": "stylex",
  },
  taglineWrap: {
    textAlign: globalColors.lostPasswordTaglineTextAlign,
    marginTop: globalColors.lostPasswordTaglineMarginTop,
    marginBottom: globalColors.lostPasswordTaglineMarginBottom,
    paddingTop: globalColors.lostPasswordTaglinePaddingTop,
  },
  title: {
    display: globalColors.lostPasswordTitleDisplay,
    fontFamily: globalColors.lostPasswordTitleFontFamily,
    fontSize: globalColors.lostPasswordTitleFontSize,
    lineHeight: globalColors.lostPasswordTitleLineHeight,
    fontWeight: globalColors.lostPasswordTitleFontWeight,
  },
  tagline: {
    marginTop: globalColors.lostPasswordTaglineCopyMarginTop,
    fontSize: globalColors.lostPasswordTaglineFontSize,
    color: globalColors.lostPasswordTaglineColor,
  },
  formWrap: {
    position: globalColors.lostPasswordFormPosition,
    width: {
      default: globalColors.lostPasswordFormWidth,
      "@media (max-width: 767px)": globalColors.lostPasswordFormResponsiveWidth,
    },
    margin: globalColors.lostPasswordFormMargin,
  },
  textInput: {
    width: {
      default: globalColors.lostPasswordInputWidth,
      "@media (max-width: 767px)": globalColors.lostPasswordInputResponsiveWidth,
    },
    height: globalColors.lostPasswordInputHeight,
    marginBottom: globalColors.lostPasswordInputMarginBottom,
    fontSize: globalColors.lostPasswordInputFontSize,
    fontWeight: globalColors.lostPasswordInputFontWeight,
    borderStyle: globalColors.lostPasswordInputBorderStyle,
    borderBottomColor: globalColors.lostPasswordInputBorderBottomColor,
    borderBottomStyle: globalColors.lostPasswordInputBorderBottomStyle,
    borderBottomWidth: globalColors.lostPasswordInputBorderBottomWidth,
    borderRadius: globalColors.lostPasswordInputBorderRadius,
    ":focus": {
      borderBottomColor: globalColors.lostPasswordInputFocusBorderBottomColor,
      outline: globalColors.lostPasswordInputFocusOutline,
      boxShadow: globalColors.lostPasswordInputFocusBoxShadow,
    },
  },
  buttonRow: {
    display: globalColors.lostPasswordButtonRowDisplay,
    textAlign: globalColors.lostPasswordButtonRowTextAlign,
    margin: globalColors.lostPasswordButtonRowMargin,
  },
  submit: {
    display: globalColors.lostPasswordSubmitDisplay,
    boxSizing: globalColors.lostPasswordSubmitBoxSizing,
    width: globalColors.lostPasswordSubmitWidth,
  },
  successAlert: {
    padding: globalColors.lostPasswordSuccessAlertPadding,
    marginBottom: globalColors.lostPasswordSuccessAlertMarginBottom,
    textShadow: globalColors.lostPasswordSuccessAlertTextShadow,
    backgroundColor: globalColors.lostPasswordSuccessAlertSurface,
    borderColor: globalColors.lostPasswordSuccessAlertBorderColor,
    borderStyle: globalColors.lostPasswordSuccessAlertBorderStyle,
    borderWidth: globalColors.lostPasswordSuccessAlertBorderWidth,
    borderRadius: globalColors.lostPasswordSuccessAlertBorderRadius,
    color: globalColors.lostPasswordSuccessAlertText,
  },
  successAlertHeading: {
    margin: globalColors.lostPasswordSuccessAlertHeadingMargin,
    fontSize: globalColors.lostPasswordSuccessAlertHeadingFontSize,
    color: globalColors.lostPasswordSuccessAlertHeadingText,
  },
  successAlertDismiss: {
    float: globalColors.lostPasswordSuccessAlertDismissFloat,
    position: globalColors.lostPasswordSuccessAlertDismissPosition,
    top: globalColors.lostPasswordSuccessAlertDismissTop,
    right: globalColors.lostPasswordSuccessAlertDismissRight,
    padding: globalColors.lostPasswordSuccessAlertDismissPadding,
    fontSize: globalColors.lostPasswordSuccessAlertDismissFontSize,
    fontWeight: globalColors.lostPasswordSuccessAlertDismissFontWeight,
    lineHeight: globalColors.lostPasswordSuccessAlertDismissLineHeight,
    color: globalColors.lostPasswordSuccessAlertDismissText,
    textShadow: globalColors.lostPasswordSuccessAlertDismissTextShadow,
    opacity: globalColors.lostPasswordSuccessAlertDismissOpacity,
    cursor: globalColors.lostPasswordSuccessAlertDismissCursor,
    backgroundColor: globalColors.lostPasswordSuccessAlertDismissSurface,
    borderStyle: globalColors.lostPasswordSuccessAlertDismissBorderStyle,
    borderWidth: globalColors.lostPasswordSuccessAlertDismissBorderWidth,
    appearance: globalColors.lostPasswordSuccessAlertDismissAppearance,
    ":hover": {
      color: globalColors.lostPasswordSuccessAlertDismissHoverText,
      textDecoration: globalColors.lostPasswordSuccessAlertDismissHoverTextDecoration,
      cursor: globalColors.lostPasswordSuccessAlertDismissHoverCursor,
      opacity: globalColors.lostPasswordSuccessAlertDismissHoverOpacity,
    },
    ":focus": {
      color: globalColors.lostPasswordSuccessAlertDismissHoverText,
      textDecoration: globalColors.lostPasswordSuccessAlertDismissHoverTextDecoration,
      cursor: globalColors.lostPasswordSuccessAlertDismissHoverCursor,
      opacity: globalColors.lostPasswordSuccessAlertDismissHoverOpacity,
    },
  },
  errorAlert: {
    padding: globalColors.lostPasswordErrorAlertPadding,
    marginBottom: globalColors.lostPasswordErrorAlertMarginBottom,
    textShadow: globalColors.lostPasswordErrorAlertTextShadow,
    backgroundColor: globalColors.lostPasswordErrorAlertSurface,
    borderColor: globalColors.lostPasswordErrorAlertBorderColor,
    borderStyle: globalColors.lostPasswordErrorAlertBorderStyle,
    borderWidth: globalColors.lostPasswordErrorAlertBorderWidth,
    borderRadius: globalColors.lostPasswordErrorAlertBorderRadius,
    color: globalColors.lostPasswordErrorAlertText,
  },
  errorAlertHeading: {
    margin: globalColors.lostPasswordErrorAlertHeadingMargin,
    fontSize: globalColors.lostPasswordErrorAlertHeadingFontSize,
    color: globalColors.lostPasswordErrorAlertHeadingText,
  },
  errorAlertDismiss: {
    float: globalColors.lostPasswordErrorAlertDismissFloat,
    position: globalColors.lostPasswordErrorAlertDismissPosition,
    top: globalColors.lostPasswordErrorAlertDismissTop,
    right: globalColors.lostPasswordErrorAlertDismissRight,
    padding: globalColors.lostPasswordErrorAlertDismissPadding,
    fontSize: globalColors.lostPasswordErrorAlertDismissFontSize,
    fontWeight: globalColors.lostPasswordErrorAlertDismissFontWeight,
    lineHeight: globalColors.lostPasswordErrorAlertDismissLineHeight,
    color: globalColors.lostPasswordErrorAlertDismissText,
    textShadow: globalColors.lostPasswordErrorAlertDismissTextShadow,
    opacity: globalColors.lostPasswordErrorAlertDismissOpacity,
    cursor: globalColors.lostPasswordErrorAlertDismissCursor,
    backgroundColor: globalColors.lostPasswordErrorAlertDismissSurface,
    borderStyle: globalColors.lostPasswordErrorAlertDismissBorderStyle,
    borderWidth: globalColors.lostPasswordErrorAlertDismissBorderWidth,
    appearance: globalColors.lostPasswordErrorAlertDismissAppearance,
    ":hover": {
      color: globalColors.lostPasswordErrorAlertDismissHoverText,
      textDecoration: globalColors.lostPasswordErrorAlertDismissHoverTextDecoration,
      cursor: globalColors.lostPasswordErrorAlertDismissHoverCursor,
      opacity: globalColors.lostPasswordErrorAlertDismissHoverOpacity,
    },
    ":focus": {
      color: globalColors.lostPasswordErrorAlertDismissHoverText,
      textDecoration: globalColors.lostPasswordErrorAlertDismissHoverTextDecoration,
      cursor: globalColors.lostPasswordErrorAlertDismissHoverCursor,
      opacity: globalColors.lostPasswordErrorAlertDismissHoverOpacity,
    },
  },
});

const anonymousBaselineClassName = stylex.props(styles.anonymousBaseline).className;
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
  const anonymousRequestedSuccess =
    sessionQuery.data?.isAnonymous === true && isSent && !errorMessage && !isSuccessAlertDismissed;
  const anonymousVisibleError =
    sessionQuery.data?.isAnonymous === true && Boolean(errorMessage) && !isErrorAlertDismissed;
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
        className={anonymousBaseline ? `page full ${anonymousBaselineClassName}` : "page full"}
        data-stylex-owner={anonymousBaseline ? "lost-password-form" : undefined}
      >
        <div
          className={
            anonymousBaseline
              ? `center-wrap tag-line-wrap reset-password ${taglineWrapClassName}`
              : "center-wrap tag-line-wrap reset-password"
          }
          data-stylex-part={anonymousBaseline ? "lost-password-tagline" : undefined}
        >
          <h1
            className={anonymousBaseline ? `title ${titleClassName}` : "title"}
            data-stylex-part={anonymousBaseline ? "lost-password-title" : undefined}
          >
            <HighlightedLegacyMessage message={title} />
          </h1>
          <p
            className={anonymousBaseline ? `tag-line ${taglineClassName}` : "tag-line"}
            data-stylex-part={anonymousBaseline ? "lost-password-copy" : undefined}
          >
            {t("app.description")}
          </p>
        </div>

        <div
          className={
            anonymousBaseline
              ? `login-form-wrap frm-wrap ${formWrapClassName}`
              : "login-form-wrap frm-wrap"
          }
          data-stylex-part={anonymousBaseline ? "lost-password-form-wrap" : undefined}
        >
          {isSent && !isSuccessAlertDismissed ? (
            anonymousRequestedSuccess ? (
              <div
                className={successAlertClassName}
                data-stylex-owner="lost-password-success-alert"
              >
                <button
                  type="button"
                  className={successAlertDismissClassName}
                  data-stylex-part="lost-password-success-alert-dismiss"
                  onClick={() => setIsSuccessAlertDismissed(true)}
                >
                  &times;
                </button>
                <h4
                  className={successAlertHeadingClassName}
                  data-stylex-part="lost-password-success-alert-heading"
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
            anonymousVisibleError ? (
              <div className={errorAlertClassName} data-stylex-owner="lost-password-error-alert">
                <button
                  type="button"
                  className={errorAlertDismissClassName}
                  data-stylex-part="lost-password-error-alert-dismiss"
                  onClick={() => setIsErrorAlertDismissed(true)}
                >
                  &times;
                </button>
                <h4
                  className={errorAlertHeadingClassName}
                  data-stylex-part="lost-password-error-alert-heading"
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
                  className={anonymousBaseline ? textInputClassName : "text"}
                  data-stylex-part={anonymousBaseline ? "lost-password-login-id" : undefined}
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
                  className={anonymousBaseline ? textInputClassName : "text"}
                  data-stylex-part={anonymousBaseline ? "lost-password-email" : undefined}
                  {...(shouldPrefillCurrentUser ? { defaultValue: currentUserEmail } : {})}
                />
              </dd>
            </dl>

            <div
              className={anonymousBaseline ? `btns-row ${buttonRowClassName}` : "btns-row"}
              data-stylex-part={anonymousBaseline ? "lost-password-submit-row" : undefined}
            >
              <button
                type="submit"
                className={
                  anonymousBaseline
                    ? `ybtn ybtn-primary ybtn-large ybtn-fullsize ${submitClassName}`
                    : "ybtn ybtn-primary ybtn-large ybtn-fullsize"
                }
                data-stylex-part={anonymousBaseline ? "lost-password-submit" : undefined}
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
