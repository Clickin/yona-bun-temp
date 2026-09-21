import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, useNavigate, useRouter } from "@tanstack/react-router";
import * as React from "react";
import { readAuthUiCapabilitiesRest, registerWithPasswordRest } from "../../api/auth";
import { apiQueryKeys } from "../../api/query-keys";
import { currentSessionQueryOptions } from "../../api/session";
import type { ReadAuthUiCapabilitiesResponse } from "../../api/types";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type AuthUiCapabilities = ReadAuthUiCapabilitiesResponse & {
  defaultAdminContact?: string;
  emailVerificationEnabled?: boolean;
  signupRequireConfirm?: boolean;
  socialLoginOnly?: boolean;
};

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
      setSubmitError(error instanceof Error ? t(error.message) : t("user.enroll.failed"));
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
        <div className="page full" data-owner="standalone-signup-form">
          <div
            className="center-wrap tag-line-wrap signup"
            data-part="standalone-signup-tagline"
            data-owner="standalone-signup-tagline"
          >
            <h1
              className="title"
              data-part="standalone-signup-title"
              data-owner="standalone-signup-title"
            >
              <HighlightedLegacyMessage message={title} />
            </h1>
            <p className="tag-line" data-part="standalone-signup-copy">
              {t("app.description")}
            </p>
          </div>

          {signupRequireConfirm ? (
            <div
              data-owner="standalone-signup-confirmation-notice"
              data-part="signup-confirmation-notice"
            >
              <p data-part="signup-confirmation-primary">{t("title.signupConfirmDesc")}</p>
              <p data-part="signup-confirmation-contact">
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
            className="signup-form-wrap frm-wrap"
            data-part="standalone-signup-form-wrap"
            data-owner="standalone-signup-form-wrap"
          >
            <form
              action={prefixBasePath(runtimeConfig.basePath, "/users/signup")}
              method="post"
              name="signup"
              onSubmit={handleSubmit}
            >
              {socialLoginOnly ? (
                <div className="btns-row nm" data-owner="standalone-signup-social-only-notice">
                  {t("app.warn.support.social.login.only")}
                </div>
              ) : (
                <>
                  <dl data-part="standalone-signup-fields">
                    <dt>
                      <label htmlFor="loginId">{t("user.signupId")}</label>
                    </dt>
                    <dd>
                      <input
                        id="loginId"
                        ref={loginIdRef}
                        type="text"
                        name="loginId"
                        className="text password"
                        data-part="standalone-signup-login-id"
                        placeholder=""
                        autoComplete="off"
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.loginId}
                        targetRef={loginIdRef}
                        validationFor="loginId"
                      />
                    </dd>

                    <dt>
                      <label htmlFor="uname">{t("user.name")}</label>
                    </dt>
                    <dd>
                      <input
                        id="uname"
                        type="text"
                        name="name"
                        className="text password"
                        data-part="standalone-signup-name"
                        placeholder=""
                        autoComplete="off"
                      />
                    </dd>

                    <dt>
                      <label htmlFor="email">{t("user.email")}</label>
                    </dt>
                    <dd>
                      <input
                        id="email"
                        ref={emailRef}
                        type="text"
                        name="email"
                        className="text password"
                        data-part="standalone-signup-email"
                        placeholder=""
                        autoComplete="off"
                        onBlur={handleEmailBlur}
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.email}
                        targetRef={emailRef}
                        validationFor="email"
                      />
                    </dd>

                    <dt>
                      <label htmlFor="password">{t("user.password")}</label>
                    </dt>
                    <dd>
                      <input
                        id="password"
                        ref={passwordRef}
                        type="password"
                        name="password"
                        className="text password"
                        data-part="standalone-signup-password"
                        placeholder=""
                        autoComplete="off"
                        onKeyUp={handlePasswordKeyUp}
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.password}
                        targetRef={passwordRef}
                        validationFor="password"
                      />
                    </dd>

                    <dt>
                      <label htmlFor="retypedPassword">{t("validation.retypePassword")}</label>
                    </dt>
                    <dd>
                      <input
                        id="retypedPassword"
                        ref={retypedPasswordRef}
                        type="password"
                        name="retypedPassword"
                        className="text password"
                        data-part="standalone-signup-retyped-password"
                        placeholder=""
                        autoComplete="off"
                        onKeyUp={handleRetypedPasswordKeyUp}
                      />
                      <FieldPopover
                        containerRef={formWrapRef}
                        message={fieldErrors.retypedPassword}
                        targetRef={retypedPasswordRef}
                        validationFor="retypedPassword"
                      />
                    </dd>
                  </dl>

                  {submitError ? <div className="error-message">{submitError}</div> : null}
                  <div className="btns-row" data-part="standalone-signup-submit-row">
                    <button
                      type="submit"
                      className="ybtn ybtn-primary ybtn-large ybtn-fullsize"
                      data-part="standalone-signup-submit"
                      disabled={registerMutation.isPending}
                    >
                      {t("user.signupBtn")}
                    </button>
                  </div>

                  <div className="act-row" data-part="standalone-signup-actions">
                    {t("user.isAlreadySignupUser")}{" "}
                    <Link to="/users/loginform" className="go-login">
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

  async function _handleLoginIdBlur(event: React.FocusEvent<HTMLInputElement>) {
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
  targetRef,
  validationFor,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  message?: string;
  targetRef: React.RefObject<HTMLInputElement | null>;
  validationFor: SignupField;
}) {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ left: "0px", top: "0px" });

  React.useLayoutEffect(() => {
    if (!message) {
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
  }, [containerRef, message, targetRef]);

  if (!message) return null;

  return (
    <div
      style={
        {
          "--user-signup-validation-popover-left": position.left,
          "--user-signup-validation-popover-top": position.top,
        } as React.CSSProperties
      }
      ref={popoverRef}
      data-owner="standalone-signup-validation-popover"
      data-part="validation-popover-surface"
      data-validation-for={validationFor}
    >
      <div data-part="validation-popover-arrow" />
      <div data-part="validation-popover-content">{message}</div>
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
