import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
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
  const loginIdRef = React.useRef<HTMLInputElement>(null);
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
  }, [socialLoginOnly]);
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
      await navigate({ href: localPath });
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
        <div className="page full">
          <div className="center-wrap tag-line-wrap signup">
            <h1 className="title">
              <HighlightedLegacyMessage message={title} />
            </h1>
            <p className="tag-line">{t("app.description")}</p>
          </div>

          {signupRequireConfirm ? (
            <div className="center-txt">
              <p>{t("title.signupConfirmDesc")}</p>
              <p>
                <ObfuscatedContactMessage
                  message={lookupLegacyMessage(language, "title.signupConfirmDesc2", {
                    args: [String(capabilities?.defaultAdminContact ?? "")],
                  })}
                />
              </p>
            </div>
          ) : null}

          <div className="signup-form-wrap frm-wrap">
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
                  <dl>
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
                        placeholder=""
                        autoComplete="off"
                        onBlur={handleLoginIdBlur}
                      />
                      <FieldPopover message={fieldErrors.loginId} />
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
                        type="text"
                        name="email"
                        className="text password"
                        placeholder=""
                        autoComplete="off"
                        onBlur={handleEmailBlur}
                      />
                      <FieldPopover message={fieldErrors.email} />
                    </dd>

                    <dt>
                      <label htmlFor="password">{t("user.password")}</label>
                    </dt>
                    <dd>
                      <input
                        id="password"
                        type="password"
                        name="password"
                        className="text password"
                        placeholder=""
                        autoComplete="off"
                        onKeyUp={handlePasswordKeyUp}
                      />
                      <FieldPopover message={fieldErrors.password} />
                    </dd>

                    <dt>
                      <label htmlFor="retypedPassword">{t("validation.retypePassword")}</label>
                    </dt>
                    <dd>
                      <input
                        id="retypedPassword"
                        type="password"
                        name="retypedPassword"
                        className="text password"
                        placeholder=""
                        autoComplete="off"
                        onKeyUp={handleRetypedPasswordKeyUp}
                      />
                      <FieldPopover message={fieldErrors.retypedPassword} />
                    </dd>
                  </dl>

                  {submitError ? <div className="error-message">{submitError}</div> : null}
                  <div className="btns-row">
                    <button
                      type="submit"
                      className="ybtn ybtn-primary ybtn-large ybtn-fullsize"
                      disabled={registerMutation.isPending}
                    >
                      {t("user.signupBtn")}
                    </button>
                  </div>

                  <div className="act-row">
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

function FieldPopover({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="popover left in">
      <div className="arrow"></div>
      <div className="popover-content">{message}</div>
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
