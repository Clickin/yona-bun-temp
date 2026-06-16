import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { AuthUiCapabilitiesViewModel } from "./-view-models";

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function readSearchParams(href: string): URLSearchParams {
  return new URL(href, "http://yona.local").searchParams;
}

function readEnabledSocialProviders(
  authUiCapabilities: AuthUiCapabilitiesViewModel | null | undefined,
): string[] {
  const providers =
    authUiCapabilities?.enabledSocialProviders ??
    authUiCapabilities?.enabled_social_providers ??
    [];
  return providers.flatMap((provider) => {
    const trimmed = provider.trim();
    return trimmed ? [trimmed] : [];
  });
}

function ProviderLogo({
  provider,
  runtimeConfig,
}: {
  provider: string;
  runtimeConfig: RuntimeConfig;
}) {
  if (provider === "github") {
    return (
      <span className="auth-provider-logo">
        <span className="github"></span> <span className="provider-name">Sign in with github</span>
      </span>
    );
  }

  if (provider === "google") {
    return (
      <span className="auth-provider-logo">
        <img
          alt="login with Google"
          src={appHref(
            runtimeConfig,
            "/assets/images/provider-logo/btn_google_light_normal_ios.svg",
          )}
        />{" "}
        Sign in with Google
      </span>
    );
  }

  return <span className="auth-provider-logo">{provider}</span>;
}

function SocialProviderButtons({
  authUiCapabilities,
  runtimeConfig,
}: {
  authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
  runtimeConfig: RuntimeConfig;
}) {
  const providers = readEnabledSocialProviders(authUiCapabilities);
  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="btns-row nm">
      {!authUiCapabilities?.socialLoginOnly ? (
        <div className="social-login-title-line">title.or</div>
      ) : null}
      {providers.map((provider) => (
        <a
          className="ybtn oauth-login-btn"
          href={appHref(runtimeConfig, `/authenticate/${encodeURIComponent(provider)}`)}
          key={provider}
        >
          <ProviderLogo provider={provider} runtimeConfig={runtimeConfig} />
        </a>
      ))}
    </div>
  );
}

export function resolvePostAuthHref(
  redirectPath: null | string | undefined,
  savedDefaultLandingPath: null | string | undefined,
): string {
  return redirectPath ?? savedDefaultLandingPath ?? "/me";
}

export function resolveAuthRedirectPath(
  searchParams: URLSearchParams | null | undefined,
): null | string {
  if (!searchParams) {
    return null;
  }

  const candidate = searchParams.get("redirectUrl") ?? searchParams.get("redirect");
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? null : trimmed;
}

export function LoginPage({
  authUiCapabilities,
  csrfToken,
  onSignIn,
  routeHref,
  runtimeConfig,
}: {
  authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
  csrfToken?: string;
  onSignIn?: (input: { identifier: string; password: string; rememberMe: boolean }) => void;
  pending?: boolean;
  routeHref: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [formState, setFormState] = React.useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });
  const searchParams = readSearchParams(routeHref);
  const redirectUrl = resolveAuthRedirectPath(searchParams);
  const canRenderLocalForm = authUiCapabilities !== null && !authUiCapabilities?.socialLoginOnly;
  const loginIdPlaceholder = authUiCapabilities?.loginIdPlaceholder?.trim() || "user.login.key";
  const passwordPlaceholder = authUiCapabilities?.passwordPlaceholder?.trim() || "user.password";
  const authProvider = searchParams.get("provider")?.trim();
  const authError = searchParams.get("error");
  const authErrorMessage =
    authError === "unsupported"
      ? authProvider
        ? `auth.socialLogin.unsupportedProvider ${authProvider}`
        : "auth.socialLogin.unsupportedProvider"
      : authError === "oauthDenied"
        ? authProvider
          ? `auth.socialLogin.denied ${authProvider}`
          : "auth.socialLogin.denied"
        : null;
  const postSubmitMessage =
    searchParams.get("signup") === "requested"
      ? "user.signup.requested"
      : searchParams.get("password") === "reset"
        ? "user.loginWithNewPassword"
        : searchParams.get("verify") === "sent"
          ? "user.verification.mail.sent"
          : null;

  return (
    <main className="app-shell">
      <div className="page full">
        <div className="center-wrap tag-line-wrap login">
          <h1 className="title">title.loginFor</h1>
          <p className="tag-line">app.description</p>
        </div>
        <div className="login-form-wrap frm-wrap">
          {authErrorMessage ? <div className="alert alert-error">{authErrorMessage}</div> : null}
          {postSubmitMessage ? (
            <div className="alert alert-success">{postSubmitMessage}</div>
          ) : null}
          {authUiCapabilities?.emailVerificationEnabled ? (
            <div className="email-verification-help">notification.confirm.mail.will.be.sent</div>
          ) : null}
          <form
            action={appHref(runtimeConfig, "/users/login")}
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              onSignIn?.(formState);
            }}
          >
            <input name="redirectUrl" type="hidden" value={redirectUrl ?? ""} />
            <input name="csrfToken" type="hidden" value={csrfToken ?? ""} />
            {authUiCapabilities?.socialLoginOnly ? (
              <div className="btns-row nm">app.warn.support.social.login.only</div>
            ) : null}
            {canRenderLocalForm ? (
              <>
                <dl>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text email"
                      id="loginIdOrEmailD"
                      name="loginIdOrEmail"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          identifier: event.target.value,
                        }))
                      }
                      placeholder={loginIdPlaceholder}
                      type="text"
                      value={formState.identifier}
                    />
                  </dd>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text password"
                      id="password"
                      name="password"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder={passwordPlaceholder}
                      type="password"
                      value={formState.password}
                    />
                  </dd>
                </dl>
                <div className="btns-row">
                  <button className="ybtn ybtn-primary ybtn-large ybtn-fullsize" type="submit">
                    button.login
                  </button>
                </div>
                <SocialProviderButtons
                  authUiCapabilities={authUiCapabilities}
                  runtimeConfig={runtimeConfig}
                />
                <div className="act-row mt5">
                  <div className="remember-me-wrap pull-left">
                    <input
                      checked={formState.rememberMe}
                      className="checkbox"
                      id="remember-me"
                      name="rememberMe"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          rememberMe: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <label className="bg-checkbox" htmlFor="remember-me">
                      title.rememberMe
                    </label>
                  </div>
                  <div className="links-wrap pull-right">
                    <a href={appHref(runtimeConfig, "/lostPassword")}>title.forgotpassword</a>
                  </div>
                </div>
              </>
            ) : null}
            {!canRenderLocalForm ? (
              <SocialProviderButtons
                authUiCapabilities={authUiCapabilities}
                runtimeConfig={runtimeConfig}
              />
            ) : null}
          </form>
        </div>
      </div>
    </main>
  );
}

export function LegacyLoginDialog({
  authUiCapabilities,
  csrfToken,
  runtimeConfig,
}: {
  authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
  csrfToken?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const canRenderLocalForm = authUiCapabilities !== null && !authUiCapabilities?.socialLoginOnly;

  return (
    <div className="modal hide loginDialog" id="loginDialog" role="dialog" tabIndex={-1}>
      <div className="modal-body">
        <div className="pull-right">
          <button
            aria-label="button.close"
            className="close mr10"
            data-dismiss="modal"
            type="button"
          >
            &times;
          </button>
        </div>
        <form
          action={appHref(runtimeConfig, "/users/login")}
          className="frm-wrap login-form-wrap"
          method="post"
        >
          <input name="csrfToken" type="hidden" value={csrfToken ?? ""} />
          {authUiCapabilities?.socialLoginOnly ? (
            <div className="btns-row nm">app.warn.support.social.login.only</div>
          ) : null}
          {canRenderLocalForm ? (
            <>
              <dl>
                <dd>
                  <input
                    autoComplete="off"
                    className="text email"
                    id="loginIdOrEmailD"
                    name="loginIdOrEmail"
                    placeholder="user.login.key"
                    type="text"
                  />
                </dd>
                <dd>
                  <input
                    autoComplete="off"
                    className="text password"
                    id="passwordD"
                    name="password"
                    placeholder="user.password"
                    type="password"
                  />
                </dd>
              </dl>
              <div className="error">
                <i className="yobicon-error"></i>
                <span className="error-message"></span>
              </div>
              <div className="btns-row nm">
                <button className="ybtn ybtn-primary fullsize" type="submit">
                  button.login
                </button>
              </div>
            </>
          ) : null}
          <SocialProviderButtons
            authUiCapabilities={authUiCapabilities}
            runtimeConfig={runtimeConfig}
          />
          {canRenderLocalForm ? (
            <>
              <div className="act-row right-txt mt20">
                <div className="pull-left">
                  <input
                    checked
                    className="checkbox"
                    id="remember-meD"
                    name="rememberMe"
                    readOnly
                    type="checkbox"
                  />
                  <label className="bg-checkbox" htmlFor="remember-meD">
                    title.rememberMe
                  </label>
                </div>
                <a href={appHref(runtimeConfig, "/lostPassword")}>title.resetPassword</a>
                <span className="gray-txt ml10 mr10">|</span>
                <a href={appHref(runtimeConfig, "/users/signupform")}>title.signup</a>
              </div>
            </>
          ) : null}
        </form>
      </div>
    </div>
  );
}

export function RegisterPage({
  authUiCapabilities,
  csrfToken,
  onRegister,
  runtimeConfig,
}: {
  authUiCapabilities?: AuthUiCapabilitiesViewModel | null;
  csrfToken?: string;
  onRegister?: (input: {
    emailAddress: string;
    loginId: string;
    name: string;
    password: string;
    retypedPassword: string;
  }) => void;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const [formState, setFormState] = React.useState({
    emailAddress: "",
    loginId: "",
    name: "",
    password: "",
    retypedPassword: "",
  });

  return (
    <main className="app-shell">
      <div className="page full">
        <div className="center-wrap tag-line-wrap signup">
          <h1 className="title">title.signupFor</h1>
          <p className="tag-line">app.description</p>
        </div>
        {authUiCapabilities?.signupRequireConfirm ? (
          <div className="center-txt">
            <p>title.signupConfirmDesc</p>
            <p>title.signupConfirmDesc2</p>
          </div>
        ) : null}
        <div className="signup-form-wrap frm-wrap">
          <form
            action={appHref(runtimeConfig, "/users/signup")}
            method="post"
            name="signup"
            onSubmit={(event) => {
              event.preventDefault();
              onRegister?.(formState);
            }}
          >
            <input name="csrfToken" type="hidden" value={csrfToken ?? ""} />
            {authUiCapabilities?.socialLoginOnly ? (
              <div className="btns-row nm">app.warn.support.social.login.only</div>
            ) : null}
            {authUiCapabilities !== null && !authUiCapabilities?.socialLoginOnly ? (
              <>
                <dl>
                  <dt>
                    <label htmlFor="loginId">user.signupId</label>
                  </dt>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text password"
                      id="loginId"
                      name="loginId"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          loginId: event.target.value,
                        }))
                      }
                      placeholder=""
                      type="text"
                      value={formState.loginId}
                    />
                  </dd>
                  <dt>
                    <label htmlFor="uname">user.name</label>
                  </dt>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text password"
                      id="uname"
                      name="name"
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder=""
                      type="text"
                      value={formState.name}
                    />
                  </dd>
                  <dt>
                    <label htmlFor="email">user.email</label>
                  </dt>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text password"
                      id="email"
                      name="email"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          emailAddress: event.target.value,
                        }))
                      }
                      placeholder=""
                      type="email"
                      value={formState.emailAddress}
                    />
                  </dd>
                  <dt>
                    <label htmlFor="password">user.password</label>
                  </dt>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text password"
                      id="password"
                      name="password"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder=""
                      type="password"
                      value={formState.password}
                    />
                  </dd>
                  <dt>
                    <label htmlFor="retypedPassword">validation.retypePassword</label>
                  </dt>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text password"
                      id="retypedPassword"
                      name="retypedPassword"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          retypedPassword: event.target.value,
                        }))
                      }
                      placeholder=""
                      type="password"
                      value={formState.retypedPassword}
                    />
                  </dd>
                </dl>
                <div className="btns-row">
                  <button className="ybtn ybtn-primary ybtn-large ybtn-fullsize" type="submit">
                    user.signupBtn
                  </button>
                </div>
                <div className="act-row">
                  user.isAlreadySignupUser{" "}
                  <a className="go-login" href={appHref(runtimeConfig, "/users/loginform")}>
                    title.login
                  </a>
                </div>
              </>
            ) : null}
          </form>
        </div>
      </div>
    </main>
  );
}

export function LostPasswordPage({
  routeHref,
  runtimeConfig,
}: {
  routeHref: string;
  runtimeConfig: RuntimeConfig;
}) {
  const searchParams = readSearchParams(routeHref);
  const feedback =
    searchParams.get("requested") === "1"
      ? { body: null, heading: "site.mail.sended", kind: "success" as const }
      : searchParams.get("error") === "invalid"
        ? {
            body: "site.resetPasswordEmail.invalidRequest",
            heading: "site.mail.fail",
            kind: "error" as const,
          }
        : null;

  return (
    <main className="app-shell">
      <div className="page full">
        <div className="center-wrap tag-line-wrap reset-password">
          <h1 className="title">title.resetPasswordFor</h1>
          <p className="tag-line">app.description</p>
        </div>
        <div className="login-form-wrap frm-wrap">
          {feedback ? (
            <div className={`alert alert-${feedback.kind === "success" ? "success" : "error"}`}>
              <button
                aria-label="button.close"
                className="close"
                data-dismiss="alert"
                type="button"
              >
                &times;
              </button>
              <h4>{feedback.heading}</h4>
              {feedback.body ? feedback.body : null}
            </div>
          ) : null}
          <form action={appHref(runtimeConfig, "/lostPassword")} method="post">
            <dl>
              <dd>
                <input
                  className="text"
                  id="loginId"
                  name="loginId"
                  placeholder="user.loginId"
                  required
                  type="text"
                />
              </dd>
              <dd>
                <input
                  className="text"
                  id="emailAddress"
                  name="emailAddress"
                  placeholder="user.email"
                  required
                  type="email"
                />
              </dd>
            </dl>
            <div className="btns-row">
              <button className="ybtn ybtn-primary ybtn-large ybtn-fullsize" type="submit">
                button.confirm
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export function ResetPasswordPage({
  routeHref,
  runtimeConfig,
}: {
  routeHref: string;
  runtimeConfig: RuntimeConfig;
}) {
  const searchParams = readSearchParams(routeHref);
  const hashString = searchParams.get("s") ?? searchParams.get("hashString") ?? "";
  const message =
    searchParams.get("error") === "invalid" ? "site.resetPasswordEmail.wrongUrl" : null;

  return (
    <main className="app-shell">
      <div className="page full">
        <div className="center-wrap tag-line-wrap reset-password">
          <h1 className="title">title.resetPasswordFor</h1>
          <p className="tag-line">app.description</p>
        </div>
        <div className="login-form-wrap frm-wrap">
          {message ? <div className="alert alert-error">{message}</div> : null}
          <form
            action={appHref(runtimeConfig, "/resetPassword")}
            method="post"
            name="passwordReset"
          >
            <input name="hashString" type="hidden" value={hashString} />
            <dl>
              <dd>
                <input
                  autoComplete="off"
                  className="text password"
                  id="password"
                  name="password"
                  placeholder="user.password"
                  type="password"
                />
              </dd>
              <dd>
                <input
                  autoComplete="off"
                  className="text password"
                  id="retypedPassword"
                  name="retypedPassword"
                  placeholder="validation.retypePassword"
                  type="password"
                />
              </dd>
            </dl>
            <div className="btns-row">
              <button className="ybtn ybtn-primary ybtn-fullsize" type="submit">
                button.confirm
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export function VerifyUserPage({
  invalid,
  loginId,
}: {
  invalid?: boolean;
  loginId: string;
  runtimeConfig: RuntimeConfig;
}) {
  if (invalid) {
    return (
      <main className="app-shell">
        <div className="error-wrap">Invalid verification</div>
      </main>
    );
  }

  return (
    <main className="app-shell page full">
      <div className="center-wrap tag-line-wrap reset-password">
        <h1 className="title">user.verified</h1>
        <p>{loginId}</p>
        <hr />
        <p className="tag-line">user.verified.detail</p>
      </div>
    </main>
  );
}
