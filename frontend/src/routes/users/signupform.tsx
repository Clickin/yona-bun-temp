import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, useNavigate, useRouter } from "@tanstack/react-router";
import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { readAuthUiCapabilitiesRest, registerWithPasswordRest } from "../../api/auth";
import { apiQueryKeys } from "../../api/query-keys";
import { currentSessionQueryOptions } from "../../api/session";
import type { ReadAuthUiCapabilitiesResponse } from "../../api/types";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { signupFormColors } from "./-signupform.stylex";

type AuthUiCapabilities = ReadAuthUiCapabilitiesResponse & {
  defaultAdminContact?: string;
  emailVerificationEnabled?: boolean;
  signupRequireConfirm?: boolean;
  socialLoginOnly?: boolean;
};

const styles = stylex.create({
  standaloneSignup: {
    "--yoram-stylex-standalone-signup": "stylex",
  },
  taglineWrap: {
    textAlign: "center",
    marginTop: "0px",
    marginBottom: "26px",
    paddingTop: "40px",
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
    fontSize: "14px",
    color: signupFormColors.taglineText,
  },
  formWrap: {
    position: "relative",
    width: {
      default: "400px",
      "@media (max-width: 767px)": "95%",
    },
    margin: "14px auto 0px",
  },
  definitionList: {
    margin: "0px",
    padding: "0px",
  },
  labelTerm: {
    margin: "3px 0px 1px",
    padding: "0px",
  },
  labelDefinition: {
    margin: "0px",
    padding: "0px",
  },
  label: {
    fontWeight: "700",
    marginRight: "5px",
  },
  textInput: {
    width: {
      default: "386px",
      "@media (max-width: 767px)": "40%",
    },
    height: "27px",
    marginBottom: "10px",
    fontSize: "12px",
    fontWeight: "700",
    borderStyle: "none",
    borderBottomColor: signupFormColors.inputBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderRadius: "0px",
    ":focus": {
      borderBottomColor: signupFormColors.accent,
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
  actionRow: {
    textAlign: "right",
    color: signupFormColors.popoverArrowBorder,
  },
  loginLink: {
    color: signupFormColors.actionText,
    fontWeight: "700",
  },
  confirmationNotice: {
    textAlign: "center",
  },
  validationPopover: {
    position: "absolute",
    top: "var(--yoram-stylex-validation-popover-top)",
    left: {
      default: "var(--yoram-stylex-validation-popover-left)",
      "@media (max-width: 767px)": "24.375px",
    },
    zIndex: "1010",
    display: "block",
    maxWidth: "276px",
    padding: "1px",
    textAlign: "left",
    whiteSpace: "normal",
    backgroundColor: signupFormColors.popoverSurface,
    borderColor: signupFormColors.popoverBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "2px",
    boxShadow: signupFormColors.popoverShadow,
    backgroundClip: "padding-box",
    lineHeight: "1",
    marginLeft: "-10px",
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
    borderLeftColor: signupFormColors.popoverArrowShadow,
    borderRightWidth: "0px",
    "::after": {
      position: "absolute",
      display: "block",
      width: "0px",
      height: "0px",
      borderColor: "transparent",
      borderStyle: "solid",
      borderWidth: "10px",
      content: '""',
      right: "1px",
      bottom: "-10px",
      borderLeftColor: signupFormColors.popoverSurface,
      borderRightWidth: "0px",
    },
  },
  validationPopoverContent: {
    padding: "9px 10px",
    lineHeight: "120%",
    width: {
      "@media (max-width: 767px)": "150px",
    },
  },
});

const standaloneSignupClassName = stylex.props(styles.standaloneSignup).className;
const taglineWrapClassName = stylex.props(styles.taglineWrap).className;
const titleClassName = stylex.props(styles.title).className;
const taglineClassName = stylex.props(styles.tagline).className;
const formWrapClassName = stylex.props(styles.formWrap).className;
const definitionListClassName = stylex.props(styles.definitionList).className;
const labelTermClassName = stylex.props(styles.labelTerm).className;
const labelDefinitionClassName = stylex.props(styles.labelDefinition).className;
const labelClassName = stylex.props(styles.label).className;
const textInputClassName = stylex.props(styles.textInput, styles.passwordInput).className;
const passwordTextInputClassName = stylex.props(styles.textInput, styles.passwordInput).className;
const buttonRowClassName = stylex.props(styles.buttonRow).className;
const submitClassName = stylex.props(styles.submit).className;
const actionRowClassName = stylex.props(styles.actionRow).className;
const loginLinkClassName = stylex.props(styles.loginLink).className;
const confirmationNoticeClassName = stylex.props(styles.confirmationNotice).className;

export const Route = createFileRoute("/users/signupform")({
  component: SignupFormRoute,
});

function SignupFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SignupFormScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SignupFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { language, t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const formWrapRef = React.useRef<HTMLDivElement>(null);
  const loginIdRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const retypedPasswordRef = React.useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<SignupField, string>>>({});
  const [submitError, setSubmitError] = React.useState("");
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const capabilitiesQuery = useQuery({
    queryFn: () => readAuthUiCapabilitiesRest(runtimeConfig),
    queryKey: apiQueryKeys.auth.capabilities(),
  });
  const capabilities = capabilitiesQuery.data as AuthUiCapabilities | undefined;
  const socialLoginOnly = capabilities?.socialLoginOnly === true;
  const signupRequireConfirm = capabilities?.signupRequireConfirm === true;
  const standardPasswordSignup = !socialLoginOnly && !signupRequireConfirm;
  const siteName = runtimeConfig.siteName ?? "Yoram";
  const title = lookupLegacyMessage(language, "title.signupFor", { args: [siteName] });

  React.useEffect(() => {
    if (!socialLoginOnly) {
      loginIdRef.current?.focus();
    }
  }, [sessionQuery.isPending, socialLoginOnly]);
  const registerMutation = useMutation({
    mutationFn: async (input: {
      emailAddress: string;
      loginId: string;
      name: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return registerWithPasswordRest(runtimeConfig, csrfToken, input);
    },
    onError(error) {
      setSubmitError(error instanceof Error ? error.message : t("user.enroll.failed"));
    },
    async onSuccess(response) {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.session() });
      if (response.isAnonymous === true && signupRequireConfirm) {
        await navigate({ to: "/", search: { signup: "requested" } });
        return;
      }
      if (response.isAnonymous === true && capabilities?.emailVerificationEnabled === true) {
        await navigate({ to: "/", search: { verify: "sent" } });
        return;
      }

      const defaultLandingPath =
        typeof response.defaultLandingPath === "string" ? response.defaultLandingPath : "/";
      const localPath = safeLocalPath(defaultLandingPath) ?? "/";
      router.history.push(prefixBasePath(runtimeConfig.basePath, localPath));
    },
  });

  if (sessionQuery.data?.isAnonymous === false) {
    return <Navigate to="/" replace />;
  }

  if (sessionQuery.isPending) {
    return null;
  }

  return (
    <>
      <title>{t("title.signup")}</title>
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <div
          className={
            standardPasswordSignup ? `page full ${standaloneSignupClassName}` : "page full"
          }
          data-stylex-owner={standardPasswordSignup ? "standalone-signup-form" : undefined}
        >
          <div
            className={
              standardPasswordSignup
                ? `center-wrap tag-line-wrap signup ${taglineWrapClassName}`
                : "center-wrap tag-line-wrap signup"
            }
            data-stylex-part={standardPasswordSignup ? "standalone-signup-tagline" : undefined}
          >
            <h1
              className={standardPasswordSignup ? `title ${titleClassName}` : "title"}
              data-stylex-part={standardPasswordSignup ? "standalone-signup-title" : undefined}
            >
              <HighlightedLegacyMessage message={title} />
            </h1>
            <p
              className={standardPasswordSignup ? `tag-line ${taglineClassName}` : "tag-line"}
              data-stylex-part={standardPasswordSignup ? "standalone-signup-copy" : undefined}
            >
              {t("app.description")}
            </p>
          </div>

          {signupRequireConfirm ? (
            <div
              className={confirmationNoticeClassName}
              data-stylex-owner="standalone-signup-confirmation-notice"
              data-stylex-part="signup-confirmation-notice"
            >
              <p data-stylex-part="signup-confirmation-primary">{t("title.signupConfirmDesc")}</p>
              <p data-stylex-part="signup-confirmation-contact">
                <ObfuscatedContactMessage
                  message={lookupLegacyMessage(language, "title.signupConfirmDesc2", {
                    args: [String(capabilities?.defaultAdminContact ?? "")],
                  })}
                />
              </p>
            </div>
          ) : null}

          <div
            ref={formWrapRef}
            className={
              standardPasswordSignup
                ? `signup-form-wrap frm-wrap ${formWrapClassName}`
                : "signup-form-wrap frm-wrap"
            }
            data-stylex-part={standardPasswordSignup ? "standalone-signup-form-wrap" : undefined}
          >
            <form
              action={prefixBasePath(runtimeConfig.basePath, "/users/signup")}
              method="post"
              name="signup"
              onSubmit={handleSubmit}
            >
              {socialLoginOnly ? (
                <div className="btns-row nm">{t("app.warn.support.social.login.only")}</div>
              ) : (
                <>
                  <dl
                    className={standardPasswordSignup ? definitionListClassName : undefined}
                    data-stylex-part={
                      standardPasswordSignup ? "standalone-signup-fields" : undefined
                    }
                  >
                    <dt className={standardPasswordSignup ? labelTermClassName : undefined}>
                      <label
                        className={standardPasswordSignup ? labelClassName : undefined}
                        htmlFor="loginId"
                      >
                        {t("user.signupId")}
                      </label>
                    </dt>
                    <dd className={standardPasswordSignup ? labelDefinitionClassName : undefined}>
                      <input
                        id="loginId"
                        ref={loginIdRef}
                        type="text"
                        name="loginId"
                        className={standardPasswordSignup ? textInputClassName : "text password"}
                        data-stylex-part={
                          standardPasswordSignup ? "standalone-signup-login-id" : undefined
                        }
                        placeholder=""
                        autoComplete="off"
                        onBlur={handleLoginIdBlur}
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.loginId}
                        standardPasswordSignup={standardPasswordSignup}
                        targetRef={loginIdRef}
                        validationFor="loginId"
                      />
                    </dd>

                    <dt className={standardPasswordSignup ? labelTermClassName : undefined}>
                      <label
                        className={standardPasswordSignup ? labelClassName : undefined}
                        htmlFor="uname"
                      >
                        {t("user.name")}
                      </label>
                    </dt>
                    <dd className={standardPasswordSignup ? labelDefinitionClassName : undefined}>
                      <input
                        id="uname"
                        type="text"
                        name="name"
                        className={standardPasswordSignup ? textInputClassName : "text password"}
                        data-stylex-part={
                          standardPasswordSignup ? "standalone-signup-name" : undefined
                        }
                        placeholder=""
                        autoComplete="off"
                      />
                    </dd>

                    <dt className={standardPasswordSignup ? labelTermClassName : undefined}>
                      <label
                        className={standardPasswordSignup ? labelClassName : undefined}
                        htmlFor="email"
                      >
                        {t("user.email")}
                      </label>
                    </dt>
                    <dd className={standardPasswordSignup ? labelDefinitionClassName : undefined}>
                      <input
                        id="email"
                        ref={emailRef}
                        type="text"
                        name="email"
                        className={standardPasswordSignup ? textInputClassName : "text password"}
                        data-stylex-part={
                          standardPasswordSignup ? "standalone-signup-email" : undefined
                        }
                        placeholder=""
                        autoComplete="off"
                        onBlur={handleEmailBlur}
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.email}
                        standardPasswordSignup={standardPasswordSignup}
                        targetRef={emailRef}
                        validationFor="email"
                      />
                    </dd>

                    <dt className={standardPasswordSignup ? labelTermClassName : undefined}>
                      <label
                        className={standardPasswordSignup ? labelClassName : undefined}
                        htmlFor="password"
                      >
                        {t("user.password")}
                      </label>
                    </dt>
                    <dd className={standardPasswordSignup ? labelDefinitionClassName : undefined}>
                      <input
                        id="password"
                        ref={passwordRef}
                        type="password"
                        name="password"
                        className={
                          standardPasswordSignup ? passwordTextInputClassName : "text password"
                        }
                        data-stylex-part={
                          standardPasswordSignup ? "standalone-signup-password" : undefined
                        }
                        placeholder=""
                        autoComplete="off"
                        onKeyUp={handlePasswordKeyUp}
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.password}
                        standardPasswordSignup={standardPasswordSignup}
                        targetRef={passwordRef}
                        validationFor="password"
                      />
                    </dd>

                    <dt className={standardPasswordSignup ? labelTermClassName : undefined}>
                      <label
                        className={standardPasswordSignup ? labelClassName : undefined}
                        htmlFor="retypedPassword"
                      >
                        {t("validation.retypePassword")}
                      </label>
                    </dt>
                    <dd className={standardPasswordSignup ? labelDefinitionClassName : undefined}>
                      <input
                        id="retypedPassword"
                        ref={retypedPasswordRef}
                        type="password"
                        name="retypedPassword"
                        className={
                          standardPasswordSignup ? passwordTextInputClassName : "text password"
                        }
                        data-stylex-part={
                          standardPasswordSignup ? "standalone-signup-retyped-password" : undefined
                        }
                        placeholder=""
                        autoComplete="off"
                        onKeyUp={handleRetypedPasswordKeyUp}
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.retypedPassword}
                        standardPasswordSignup={standardPasswordSignup}
                        targetRef={retypedPasswordRef}
                        validationFor="retypedPassword"
                      />
                    </dd>
                  </dl>

                  {submitError ? <div className="error-message">{submitError}</div> : null}
                  <div
                    className={
                      standardPasswordSignup ? `btns-row ${buttonRowClassName}` : "btns-row"
                    }
                    data-stylex-part={
                      standardPasswordSignup ? "standalone-signup-submit-row" : undefined
                    }
                  >
                    <button
                      type="submit"
                      className={
                        standardPasswordSignup
                          ? `ybtn ybtn-primary ybtn-large ybtn-fullsize ${submitClassName}`
                          : "ybtn ybtn-primary ybtn-large ybtn-fullsize"
                      }
                      data-stylex-part={
                        standardPasswordSignup ? "standalone-signup-submit" : undefined
                      }
                      disabled={registerMutation.isPending}
                    >
                      {t("user.signupBtn")}
                    </button>
                  </div>

                  <div
                    className={standardPasswordSignup ? `act-row ${actionRowClassName}` : "act-row"}
                    data-stylex-part={
                      standardPasswordSignup ? "standalone-signup-actions" : undefined
                    }
                  >
                    {t("user.isAlreadySignupUser")}{" "}
                    <Link
                      to="/users/loginform"
                      className={
                        standardPasswordSignup ? `go-login ${loginLinkClassName}` : "go-login"
                      }
                    >
                      {t("title.login")}
                    </Link>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </SiteLayoutShell>
    </>
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (socialLoginOnly) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const nextErrors = validateSignupForm(form, t);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    registerMutation.mutate({
      emailAddress: String(form.get("email") ?? ""),
      loginId: String(form.get("loginId") ?? ""),
      name: String(form.get("name") ?? ""),
      password: String(form.get("password") ?? ""),
      retypedPassword: String(form.get("retypedPassword") ?? ""),
    });
  }

  function setFieldError(field: SignupField, message: string) {
    setFieldErrors((current) => ({ ...current, [field]: message }));
  }

  function clearFieldError(field: SignupField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleLoginIdBlur(event: React.FocusEvent<HTMLInputElement>) {
    const loginId = event.currentTarget.value.trim().toLowerCase();
    event.currentTarget.value = loginId;

    if (!isValidLoginId(loginId)) {
      setFieldError("loginId", t("validation.allowedCharsForLoginId"));
      return;
    }
    if (!loginId) {
      clearFieldError("loginId");
      return;
    }

    const result = await readLegacyExistence(
      runtimeConfig,
      `/user/isUsed?name=${encodeURIComponent(loginId)}`,
    );
    if (result?.isExist === true) {
      setFieldError("loginId", t("validation.duplicated"));
    } else if (result?.isReserved === true) {
      setFieldError("loginId", t("validation.reservedWord"));
    } else {
      clearFieldError("loginId");
    }
  }

  async function handleEmailBlur(event: React.FocusEvent<HTMLInputElement>) {
    const email = event.currentTarget.value.trim();
    if (!email) {
      clearFieldError("email");
      return;
    }

    const result = await readLegacyExistence(
      runtimeConfig,
      `/user/isEmailExist?email=${encodeURIComponent(email)}`,
    );
    if (result?.isExist === true) {
      setFieldError("email", t("validation.duplicated"));
    } else {
      clearFieldError("email");
    }
  }

  function handlePasswordKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
    const password = event.currentTarget.value.trim();
    if (password.length < 4) {
      setFieldError("password", t("validation.tooShortPassword"));
    } else {
      clearFieldError("password");
    }
    validateRetypedPassword(event.currentTarget.form);
  }

  function handleRetypedPasswordKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
    validateRetypedPassword(event.currentTarget.form);
  }

  function validateRetypedPassword(form: HTMLFormElement | null) {
    if (!form) return;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const retypedPassword = String(formData.get("retypedPassword") ?? "");
    if (retypedPassword !== password) {
      setFieldError("retypedPassword", t("validation.passwordMismatch"));
    } else {
      clearFieldError("retypedPassword");
    }
  }
}

type SignupField = "loginId" | "email" | "password" | "retypedPassword";

function validateSignupForm(
  form: FormData,
  t: (key: string) => string,
): Partial<Record<SignupField, string>> {
  const loginId = String(form.get("loginId") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const retypedPassword = String(form.get("retypedPassword") ?? "");
  const nextErrors: Partial<Record<SignupField, string>> = {};

  if (!loginId) nextErrors.loginId = t("validation.required");
  else if (!isValidLoginId(loginId)) nextErrors.loginId = t("validation.allowedCharsForLoginId");
  if (!email) nextErrors.email = t("validation.required");
  else if (!isValidEmail(email)) nextErrors.email = t("validation.invalidEmail");
  if (!password) nextErrors.password = t("validation.required");
  else if (password.length < 4) nextErrors.password = t("validation.tooShortPassword");
  if (!retypedPassword) nextErrors.retypedPassword = t("validation.required");
  else if (retypedPassword !== password) {
    nextErrors.retypedPassword = t("validation.passwordMismatch");
  }

  return nextErrors;
}

function isValidLoginId(loginId: string) {
  return /^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$/.test(loginId);
}

function isValidEmail(email: string) {
  return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9])?/i.test(
    email,
  );
}

async function readLegacyExistence(runtimeConfig: RuntimeConfig, path: string) {
  const response = await fetch(prefixBasePath(runtimeConfig.basePath, path), {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return (await response.json()) as { isExist?: boolean; isReserved?: boolean };
}

function FieldPopover({
  containerRef,
  message,
  standardPasswordSignup,
  targetRef,
  validationFor,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  message?: string;
  standardPasswordSignup: boolean;
  targetRef: React.RefObject<HTMLInputElement | null>;
  validationFor: SignupField;
}) {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ left: "0px", top: "0px" });

  React.useLayoutEffect(() => {
    if (!message || !standardPasswordSignup) {
      return;
    }

    const updatePosition = () => {
      const container = containerRef.current;
      const target = targetRef.current;
      const popover = popoverRef.current;
      if (!container || !target || !popover) {
        return;
      }
      const containerBox = container.getBoundingClientRect();
      const targetBox = target.getBoundingClientRect();
      const popoverBox = popover.getBoundingClientRect();
      setPosition({
        left: `${targetBox.left - containerBox.left - popoverBox.width}px`,
        top: `${targetBox.top - containerBox.top + (targetBox.height - popoverBox.height) / 2}px`,
      });
    };

    updatePosition();
  }, [containerRef, message, standardPasswordSignup, targetRef]);

  if (!message) return null;
  if (!standardPasswordSignup) {
    return (
      <div className="popover left in">
        <div className="arrow"></div>
        <div className="popover-content">{message}</div>
      </div>
    );
  }

  return (
    <div
      {...stylex.props(styles.validationPopover)}
      ref={popoverRef}
      data-stylex-owner="standalone-signup-validation-popover"
      data-stylex-part="validation-popover-surface"
      data-stylex-validation-for={validationFor}
      style={
        {
          "--yoram-stylex-validation-popover-left": position.left,
          "--yoram-stylex-validation-popover-top": position.top,
        } as React.CSSProperties
      }
    >
      <div
        {...stylex.props(styles.validationPopoverArrow)}
        data-stylex-part="validation-popover-arrow"
      />
      <div
        {...stylex.props(styles.validationPopoverContent)}
        data-stylex-part="validation-popover-content"
      >
        {message}
      </div>
    </div>
  );
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

function ObfuscatedContactMessage({ message }: { message: string }) {
  const match = /^(.*)<span class="obfuscate">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return <>{message}</>;
  }

  return (
    <>
      {match[1]}
      <span className="obfuscate">{match[2]}</span>
      {match[3]}
    </>
  );
}

function safeLocalPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}
