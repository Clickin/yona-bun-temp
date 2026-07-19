import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { completePasswordReset, readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { resetPasswordStyles, resetPasswordTheme } from "./-resetPassword.stylex";
import { SiteLayoutShell } from "./-home-route-screen";

type ResetPasswordSearch = {
  error?: string;
  s?: string;
};

const legacyAnchorActiveOptions = {
  exact: true,
  explicitUndefined: true,
} as const;
const legacyAnchorActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

const styles = stylex.create({
  validTokenReset: {
    "--yoram-stylex-reset-password": "stylex",
  },
  taglineWrap: {
    textAlign: "center",
    marginTop: "0px",
    marginBottom: "26px",
    paddingTop: "80px",
  },
  title: {
    display: "inline-block",
    margin: "0px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "3.3em",
    lineHeight: "42px",
    fontWeight: "400",
  },
  titleHighlight: {
    color: resetPasswordTheme.titleHighlight,
  },
  tagline: {
    marginTop: "10px",
    marginBottom: "0px",
    fontSize: "1.2em",
    color: resetPasswordTheme.taglineText,
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
    boxSizing: "content-box",
    width: {
      default: "386px",
      "@media (max-width: 767px)": "95%",
    },
    height: "27px",
    minHeight: "0px",
    marginBottom: "10px",
    fontSize: "12px",
    fontWeight: "700",
    borderStyle: "none",
    borderBottomColor: resetPasswordTheme.inputBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderRadius: "0px",
    ":focus": {
      borderBottomColor: resetPasswordTheme.inputFocusBorder,
      outline: "none",
      boxShadow: "none",
    },
  },
  passwordInput: {
    marginBottom: "15px",
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
  validationPopover: {
    "--yoram-stylex-reset-password-validation-popover": "stylex",
    position: "absolute",
    zIndex: "1010",
    display: "block",
    maxWidth: "144px",
    padding: "1px",
    marginLeft: "-10px",
    textAlign: "left",
    whiteSpace: "normal",
    backgroundColor: resetPasswordTheme.validationSurface,
    borderColor: resetPasswordTheme.validationBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "2px",
    boxShadow: resetPasswordTheme.validationShadow,
    backgroundClip: "padding-box",
    lineHeight: "1",
  },
  validationPopoverArrow: {
    position: "absolute",
    display: "block",
    width: "0px",
    height: "0px",
    borderColor: "transparent",
    borderStyle: "solid",
    borderWidth: "11px",
    top: "50%",
    right: "-11px",
    marginTop: "-11px",
    borderLeftColor: resetPasswordTheme.validationArrowBorder,
    borderRightWidth: "0px",
    "::after": {
      content: '""',
      position: "absolute",
      display: "block",
      width: "0px",
      height: "0px",
      borderColor: "transparent",
      borderStyle: "solid",
      borderWidth: "10px",
      right: "1px",
      bottom: "-10px",
      borderLeftColor: resetPasswordTheme.validationArrowSurface,
      borderRightWidth: "0px",
    },
  },
  validationPopoverContent: {
    padding: "9px 10px",
    lineHeight: "120%",
  },
  badRequest: {
    "--yoram-stylex-reset-password-bad-request": "stylex",
  },
  badRequestErrorWrap: {
    padding: "100px 0px",
    textAlign: "center",
  },
  badRequestMessage: {
    margin: "30px 0px",
    fontWeight: "700",
    fontSize: "16px",
    color: resetPasswordTheme.badRequestText,
  },
});

const validTokenResetClassName = stylex.props(styles.validTokenReset).className;
const taglineWrapClassName = stylex.props(styles.taglineWrap).className;
const titleClassName = stylex.props(styles.title).className;
const titleHighlightClassName = stylex.props(styles.titleHighlight).className;
const taglineClassName = stylex.props(styles.tagline).className;
const formWrapClassName = stylex.props(styles.formWrap).className;
const passwordInputClassName = stylex.props(styles.textInput, styles.passwordInput).className;
const buttonRowClassName = stylex.props(styles.buttonRow).className;
const submitClassName = stylex.props(styles.submit).className;
const validationPopoverArrowClassName = stylex.props(styles.validationPopoverArrow).className;
const validationPopoverContentClassName = stylex.props(styles.validationPopoverContent).className;
const badRequestClassName = stylex.props(styles.badRequest).className;
const badRequestErrorWrapClassName = stylex.props(styles.badRequestErrorWrap).className;
const badRequestMessageClassName = stylex.props(styles.badRequestMessage).className;

export const Route = createFileRoute("/resetPassword")({
  component: ResetPasswordRoute,
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    ...(typeof search.error === "string" && search.error ? { error: search.error } : {}),
    ...(typeof search.s === "string" && search.s ? { s: search.s } : {}),
  }),
});

function ResetPasswordRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ResetPasswordScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ResetPasswordScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { error, s } = Route.useSearch();
  const resetToken = s ?? "";
  const validTokenReset = !error && Boolean(resetToken);
  const { language, t } = useLegacyMessages();
  const navigate = useNavigate();
  const formRef = React.useRef<HTMLFormElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const retypedPasswordInputRef = React.useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<"password" | "retypedPassword", string>>
  >({});
  const siteName = runtimeConfig.siteName ?? "Yoram";
  const browserTitle = t("title.resetPassword");
  const title = lookupLegacyMessage(language, "title.resetPasswordFor", {
    args: [siteName],
  });
  // Reset completion changes credentials without authenticating or changing the current session.
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  const resetMutation = useMutation({
    mutationFn: async (input: {
      hashString: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return completePasswordReset(runtimeConfig, csrfToken, input);
    },
    async onError() {
      await navigate({
        href: `/resetPassword?error=invalid&s=${encodeURIComponent(resetToken)}`,
      });
    },
    async onSuccess() {
      await navigate({ href: "/users/loginform?password=reset" });
    },
  });

  if (error) {
    return (
      <BadRequestPage
        runtimeConfig={runtimeConfig}
        message={t("site.resetPasswordEmail.wrongUrl")}
      />
    );
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <title>{browserTitle}</title>
      <div
        className={validTokenReset ? `page full ${validTokenResetClassName}` : "page full"}
        data-stylex-owner={validTokenReset ? "reset-password-form" : undefined}
      >
        <div
          className={
            validTokenReset
              ? `center-wrap tag-line-wrap reset-password ${taglineWrapClassName}`
              : "center-wrap tag-line-wrap reset-password"
          }
          data-stylex-part={validTokenReset ? "reset-password-tagline" : undefined}
        >
          <h1
            className={validTokenReset ? `title ${titleClassName}` : "title"}
            data-stylex-part={validTokenReset ? "reset-password-title" : undefined}
          >
            <HighlightedLegacyMessage
              highlightClassName={validTokenReset ? titleHighlightClassName : undefined}
              message={title}
            />
          </h1>
          <p
            className={validTokenReset ? `tag-line ${taglineClassName}` : "tag-line"}
            data-stylex-part={validTokenReset ? "reset-password-copy" : undefined}
          >
            {t("app.description")}
          </p>
        </div>

        <div
          className={
            validTokenReset
              ? `login-form-wrap frm-wrap ${formWrapClassName}`
              : "login-form-wrap frm-wrap"
          }
          data-stylex-part={validTokenReset ? "reset-password-form-wrap" : undefined}
        >
          <form
            action={prefixBasePath(runtimeConfig.basePath, "/resetPassword")}
            method="post"
            name="passwordReset"
            ref={formRef}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <input type="hidden" name="hashString" value={resetToken} />
            <dl>
              <dd>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type="password"
                  name="password"
                  className={validTokenReset ? passwordInputClassName : "text password"}
                  data-stylex-part={validTokenReset ? "reset-password-password" : undefined}
                  placeholder={t("user.password")}
                  autoComplete="off"
                  onBlur={validateCurrentForm}
                />
                <FieldPopover
                  anchorRef={passwordInputRef}
                  message={fieldErrors.password}
                  stylexOwned={validTokenReset}
                />
              </dd>
              <dd>
                <input
                  ref={retypedPasswordInputRef}
                  id="retypedPassword"
                  type="password"
                  name="retypedPassword"
                  className={validTokenReset ? passwordInputClassName : "text password"}
                  data-stylex-part={validTokenReset ? "reset-password-retyped-password" : undefined}
                  placeholder={t("validation.retypePassword")}
                  autoComplete="off"
                  onBlur={validateCurrentForm}
                />
                <FieldPopover
                  anchorRef={retypedPasswordInputRef}
                  message={fieldErrors.retypedPassword}
                  stylexOwned={validTokenReset}
                />
              </dd>
            </dl>

            <div
              className={validTokenReset ? `btns-row ${buttonRowClassName}` : "btns-row"}
              data-stylex-part={validTokenReset ? "reset-password-submit-row" : undefined}
            >
              <button
                type="submit"
                className={
                  validTokenReset
                    ? `ybtn ybtn-primary ybtn-fullsize ${submitClassName}`
                    : "ybtn ybtn-primary ybtn-fullsize"
                }
                data-stylex-part={validTokenReset ? "reset-password-submit" : undefined}
                disabled={resetMutation.isPending}
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
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const retypedPassword = String(form.get("retypedPassword") ?? "");
    const nextErrors = validateResetPasswordForm(password, retypedPassword, t);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    resetMutation.mutate({
      hashString: resetToken,
      password,
      retypedPassword,
    });
  }

  function validateCurrentForm() {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const password = String(form.get("password") ?? "");
    const retypedPassword = String(form.get("retypedPassword") ?? "");
    setFieldErrors(validateResetPasswordForm(password, retypedPassword, t));
  }
}

function validateResetPasswordForm(
  password: string,
  retypedPassword: string,
  t: (key: string) => string,
): Partial<Record<"password" | "retypedPassword", string>> {
  const nextErrors: Partial<Record<"password" | "retypedPassword", string>> = {};

  if (!password) {
    nextErrors.password = t("validation.required");
  } else if (password.length < 4) {
    nextErrors.password = t("validation.tooShortPassword");
  }
  if (!retypedPassword) {
    nextErrors.retypedPassword = t("validation.required");
  } else if (retypedPassword !== password) {
    nextErrors.retypedPassword = t("validation.passwordMismatch");
  }

  return nextErrors;
}

function FieldPopover({
  anchorRef,
  message,
  stylexOwned,
}: {
  anchorRef: React.RefObject<HTMLInputElement | null>;
  message?: string;
  stylexOwned: boolean;
}) {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<{ left: number; top: number } | null>(null);

  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!message || !anchor || !popover) {
      setPlacement(null);
      return;
    }

    const left = anchor.offsetLeft - popover.offsetWidth;
    const top = anchor.offsetTop + (anchor.offsetHeight - popover.offsetHeight) / 2;
    setPlacement({ left, top });
  }, [anchorRef, message]);

  if (!message) return null;
  const position = {
    left: placement ? `${placement.left}px` : "-154px",
    top: placement ? `${placement.top}px` : "0",
  };
  const ownedStyle = stylex.props(
    styles.validationPopover,
    resetPasswordStyles.validationPopoverPosition(position.left, position.top),
  );
  const fallbackStyle = stylex.props(
    resetPasswordStyles.validationPopoverFallback,
    resetPasswordStyles.validationPopoverPosition(position.left, position.top),
  );
  if (stylexOwned) {
    return (
      <div
        ref={popoverRef}
        {...ownedStyle}
        data-stylex-owner="reset-password-validation-popover"
        data-stylex-part="reset-password-validation-popover-surface"
      >
        <div
          className={validationPopoverArrowClassName}
          data-stylex-part="reset-password-validation-popover-arrow"
        ></div>
        <div
          className={validationPopoverContentClassName}
          data-stylex-part="reset-password-validation-popover-content"
        >
          {message}
        </div>
      </div>
    );
  }
  return (
    <div
      ref={popoverRef}
      {...fallbackStyle}
      className={`popover left in ${fallbackStyle.className}`}
    >
      <div className="arrow"></div>
      <div className="popover-content">{message}</div>
    </div>
  );
}

function BadRequestPage({
  message,
  runtimeConfig,
}: {
  message: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <div
        className={`page-wrap-outer reset-password-bad-request ${badRequestClassName}`}
        data-stylex-owner="reset-password-bad-request"
      >
        <div className="project-page-wrap">
          <div
            className={`error-wrap ${badRequestErrorWrapClassName}`}
            data-stylex-part="reset-password-bad-request-error-wrap"
          >
            <i className="ico-404" />
            <p
              className={badRequestMessageClassName}
              data-stylex-part="reset-password-bad-request-message"
            >
              {message}
            </p>
            <Link
              to=".."
              activeOptions={legacyAnchorActiveOptions}
              activeProps={legacyAnchorActiveProps}
              className="ybtn ybtn-info"
            >
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function HighlightedLegacyMessage({
  highlightClassName,
  message,
}: {
  highlightClassName?: string;
  message: string;
}) {
  const match = /^(.*)<span class="highlight">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return <>{message}</>;
  }

  return (
    <>
      {match[1]}
      <span
        className={highlightClassName ? `highlight ${highlightClassName}` : "highlight"}
        data-stylex-part={highlightClassName ? "reset-password-title-highlight" : undefined}
      >
        {match[2]}
      </span>
      {match[3]}
    </>
  );
}
