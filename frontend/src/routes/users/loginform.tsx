import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, useRouter } from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest, signInWithPasswordRest } from "../../api/auth";
import { apiQueryKeys } from "../../api/query-keys";
import { currentSessionQueryOptions } from "../../api/session";
import type { ReadAuthUiCapabilitiesResponse } from "../../api/types";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { useRootToast } from "../__root";

type LoginFormSearch = {
  password?: string;
  redirectUrl?: string;
};

type AuthUiCapabilities = ReadAuthUiCapabilitiesResponse & {
  emailVerificationEnabled?: boolean;
  enabledSocialProviders?: string[];
  loginIdPlaceholder?: string;
  passwordPlaceholder?: string;
  socialLoginOnly?: boolean;
};

export const Route = createFileRoute("/users/loginform")({
  component: LoginFormRoute,
  validateSearch: (search: Record<string, unknown>): LoginFormSearch => {
    const password = nonEmptyString(search.password);
    const redirectUrl = nonEmptyString(search.redirectUrl);
    return {
      ...(password === null ? {} : { password }),
      ...(redirectUrl === null ? {} : { redirectUrl }),
    };
  },
});

function LoginFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <LoginFormScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function LoginFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { password = "", redirectUrl = "" } = Route.useSearch();
  const { language, t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const redirectingRef = React.useRef(false);
  const [submitError, setSubmitError] = React.useState("");
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const capabilitiesQuery = useQuery({
    queryFn: () => readAuthUiCapabilitiesRest(runtimeConfig),
    queryKey: apiQueryKeys.auth.capabilities(),
  });
  const capabilities = capabilitiesQuery.data as AuthUiCapabilities | undefined;
  const socialLoginOnly = capabilities?.socialLoginOnly === true;
  const socialProviders = Array.isArray(capabilities?.enabledSocialProviders)
    ? capabilities.enabledSocialProviders
    : [];
  const loginIdPlaceholder =
    nonEmptyString(capabilities?.loginIdPlaceholder) ?? t("user.login.key");
  const passwordPlaceholder =
    nonEmptyString(capabilities?.passwordPlaceholder) ?? t("user.password");
  const siteName = runtimeConfig.siteName ?? "Yoram";
  const title = lookupLegacyMessage(language, "title.loginFor", { args: [siteName] });
  const showPasswordResetFlash = password === "reset";
  const signInMutation = useMutation({
    mutationFn: async (input: { identifier: string; password: string; rememberMe: boolean }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return signInWithPasswordRest(runtimeConfig, csrfToken, {
        identifier: input.identifier,
        password: input.password,
        rememberMe: input.rememberMe,
      });
    },
    onError(error) {
      setSubmitError(error instanceof Error ? error.message : t("user.login.failed"));
    },
    async onSuccess(session) {
      const defaultLandingPath =
        typeof session.defaultLandingPath === "string" ? session.defaultLandingPath : "";
      const localDestination =
        safeLocalPath(redirectUrl, runtimeConfig.basePath) ??
        safeLocalPath(defaultLandingPath, runtimeConfig.basePath) ??
        "/";
      const destination =
        localDestination === "/" && runtimeConfig.basePath !== "/"
          ? `${runtimeConfig.basePath}/`
          : prefixBasePath(runtimeConfig.basePath, localDestination);
      redirectingRef.current = true;
      router.history.push(destination);
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.session() });
    },
  });

  if (sessionQuery.data?.isAnonymous === false && !redirectingRef.current) {
    return <Navigate to="/" replace />;
  }

  if (sessionQuery.isPending) {
    return null;
  }

  return (
    <>
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <title>{t("title.login")}</title>
        <div className="page full">
          <div className="center-wrap tag-line-wrap login">
            <h1 className="title">
              <HighlightedLegacyMessage message={title} />
            </h1>
            <p className="tag-line">{t("app.description")}</p>
          </div>
          <div className="login-form-wrap frm-wrap">
            {capabilities?.emailVerificationEnabled === true ? (
              <div className="email-verification-help">
                {t("notification.confirm.mail.will.be.sent")}
              </div>
            ) : null}
            <form
              action={prefixBasePath(runtimeConfig.basePath, "/users/login")}
              method="POST"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <input type="hidden" name="redirectUrl" value={redirectUrl} />
              {socialLoginOnly ? (
                <div className="btns-row nm">{t("app.warn.support.social.login.only")}</div>
              ) : (
                <>
                  <dl>
                    <dd>
                      <input
                        id="loginIdOrEmailD"
                        name="loginIdOrEmail"
                        type="text"
                        className="text email"
                        autoComplete="off"
                        placeholder={loginIdPlaceholder}
                      />
                    </dd>
                    <dd>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        className="text password"
                        autoComplete="off"
                        placeholder={passwordPlaceholder}
                      />
                    </dd>
                  </dl>
                  {submitError ? <div className="error-message">{submitError}</div> : null}
                  <div className="btns-row">
                    <button
                      type="submit"
                      className="ybtn ybtn-primary ybtn-large ybtn-fullsize"
                      disabled={signInMutation.isPending}
                    >
                      {t("button.login")}
                    </button>
                  </div>
                </>
              )}

              <div className="btns-row nm">
                {socialProviders.length > 0 && !socialLoginOnly ? (
                  <div className="social-login-title-line"> {t("title.or")} </div>
                ) : null}
                {socialProviders.map((provider) => (
                  <OAuthProviderLink
                    key={provider}
                    basePath={runtimeConfig.basePath}
                    provider={provider}
                  />
                ))}
              </div>
              {!socialLoginOnly ? (
                <div className="act-row mt5">
                  <div className="remember-me-wrap pull-left">
                    <input
                      id="remember-me"
                      type="checkbox"
                      name="rememberMe"
                      className="checkbox"
                      defaultChecked
                    />
                    <label htmlFor="remember-me" className="bg-checkbox">
                      {t("title.rememberMe")}
                    </label>
                  </div>

                  <div className="links-wrap pull-right">
                    <Link to="/lostPassword">{t("title.forgotpassword")}</Link>
                  </div>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </SiteLayoutShell>
      {showPasswordResetFlash ? <LoginFlashToast message={t("user.loginWithNewPassword")} /> : null}
    </>
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (socialLoginOnly) {
      return;
    }

    const form = new FormData(event.currentTarget);
    signInMutation.mutate({
      identifier: String(form.get("loginIdOrEmail") ?? ""),
      password: String(form.get("password") ?? ""),
      rememberMe: form.get("rememberMe") === "on",
    });
  }
}

function LoginFlashToast({ message }: { message: string }) {
  const setRootToast = useRootToast();

  React.useEffect(() => {
    if (!message) {
      return;
    }
    setRootToast({ key: "loginform-password-reset", message });
    return () => setRootToast(null);
  }, [message, setRootToast]);

  return null;
}

function OAuthProviderLink({ basePath, provider }: { basePath: string; provider: string }) {
  const normalized = provider.trim().toLowerCase();
  if (normalized !== "github" && normalized !== "google") {
    return null;
  }
  const providerLoginPath: string = `/authenticate/${normalized}`;

  return (
    <Link
      to={providerLoginPath}
      href={prefixBasePath(basePath, providerLoginPath)}
      className="ybtn oauth-login-btn"
      reloadDocument
    >
      {normalized === "github" ? (
        <span className="auth-provider-logo">
          <span className="github">
            <svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.53 16 8 16 3.58 12.42 0 8 0z" />
            </svg>
          </span>{" "}
          <span className="provider-name">Sign in with github</span>
        </span>
      ) : (
        <span className="auth-provider-logo">
          <img
            src={prefixBasePath(
              basePath,
              "/assets/images/provider-logo/btn_google_light_normal_ios.svg",
            )}
            alt="login with Google"
          />{" "}
          Sign in with Google
        </span>
      )}
    </Link>
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

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function safeLocalPath(value: string, basePath: string) {
  if (value.startsWith("//")) {
    return null;
  }

  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const origin =
    typeof globalThis.location === "undefined" ? "http://yoram.local" : globalThis.location.origin;
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return null;
  }

  if (url.origin !== origin || (!isAbsolute && !value.startsWith("/"))) {
    return null;
  }

  const normalizedBase = basePath === "/" ? "" : basePath.replace(/\/+$/u, "");
  if (isAbsolute) {
    if (
      normalizedBase &&
      url.pathname !== normalizedBase &&
      !url.pathname.startsWith(`${normalizedBase}/`)
    ) {
      return null;
    }
    url.pathname = normalizedBase ? url.pathname.slice(normalizedBase.length) || "/" : url.pathname;
  } else if (
    normalizedBase &&
    (url.pathname === normalizedBase || url.pathname.startsWith(`${normalizedBase}/`))
  ) {
    url.pathname = url.pathname.slice(normalizedBase.length) || "/";
  }

  if (url.pathname.startsWith("//")) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
