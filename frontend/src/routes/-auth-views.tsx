import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { AuthUiCapabilitiesViewModel } from "./-view-models";

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function readSearchParams(href: string): URLSearchParams {
  return new URL(href, "http://yona.local").searchParams;
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
  pending,
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
  const loginIdPlaceholder = authUiCapabilities?.loginIdPlaceholder?.trim() || "Login ID or email";
  const passwordPlaceholder = authUiCapabilities?.passwordPlaceholder?.trim() || "Password";
  const postSubmitMessage =
    searchParams.get("signup") === "requested"
      ? "Sign up requires confirmation."
      : searchParams.get("password") === "reset"
        ? "Login with your new password."
        : searchParams.get("verify") === "sent"
          ? "Confirmation request was accepted."
          : null;

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Login for Yona</h1>
      <p className="lede">All-in-one software development platform.</p>
      {postSubmitMessage ? <p className="lede">{postSubmitMessage}</p> : null}
      {authUiCapabilities?.emailVerificationEnabled ? (
        <p className="lede">Email verification is required.</p>
      ) : null}
      {authUiCapabilities?.socialLoginOnly ? <p className="lede">Social login only</p> : null}
      {canRenderLocalForm ? (
        <>
          <form
            action={appHref(runtimeConfig, "/users/login")}
            className="runtime-grid"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              onSignIn?.(formState);
            }}
          >
            <label>
              <span>Login ID or email</span>
              <input
                autoComplete="off"
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
            </label>
            <input name="redirectUrl" type="hidden" value={redirectUrl ?? ""} />
            <input name="csrfToken" type="hidden" value={csrfToken ?? ""} />
            <label>
              <span>Password</span>
              <input
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
            </label>
            <label>
              <input
                checked={formState.rememberMe}
                name="rememberMe"
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    rememberMe: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              <span>Remember me</span>
            </label>
            <button type="submit">{pending ? "Logging in…" : "Login"}</button>
          </form>
          <div className="runtime-grid">
            <div>
              <a href={appHref(runtimeConfig, "/lostPassword")}>Forgot password</a>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}

export function RegisterPage({
  authUiCapabilities,
  csrfToken,
  onRegister,
  pending,
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
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Sign Up for Yona</h1>
      {authUiCapabilities?.signupRequireConfirm ? (
        <p className="lede">Sign up requires confirmation.</p>
      ) : null}
      {authUiCapabilities?.socialLoginOnly ? <p className="lede">Social login only</p> : null}
      {authUiCapabilities !== null && !authUiCapabilities?.socialLoginOnly ? (
        <>
          <form
            action={appHref(runtimeConfig, "/users/signup")}
            className="runtime-grid"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              onRegister?.(formState);
            }}
          >
            <label>
              <span>Login ID</span>
              <input
                name="loginId"
                type="text"
                value={formState.loginId}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    loginId: event.target.value,
                  }))
                }
              />
            </label>
            <input name="csrfToken" type="hidden" value={csrfToken ?? ""} />
            <label>
              <span>Name</span>
              <input
                name="name"
                type="text"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Email</span>
              <input
                name="emailAddress"
                type="email"
                value={formState.emailAddress}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    emailAddress: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Retype password</span>
              <input
                name="retypedPassword"
                type="password"
                value={formState.retypedPassword}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    retypedPassword: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit">{pending ? "Signing up…" : "Sign up"}</button>
          </form>
          <p className="lede">
            Already signed up?{" "}
            <a className="go-login" href={appHref(runtimeConfig, "/users/loginform")}>
              Login
            </a>
          </p>
        </>
      ) : null}
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
  const message =
    searchParams.get("requested") === "1"
      ? "Password reset request was accepted."
      : searchParams.get("error") === "invalid"
        ? "Invalid login ID or email address."
        : null;

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Reset Password for Yona</h1>
      {message ? <p className="lede">{message}</p> : null}
      <form action={appHref(runtimeConfig, "/lostPassword")} className="runtime-grid" method="post">
        <label>
          <span>Login ID</span>
          <input name="loginId" type="text" />
        </label>
        <label>
          <span>Email</span>
          <input name="emailAddress" type="email" />
        </label>
        <button type="submit">Confirm</button>
      </form>
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
  const message = searchParams.get("error") === "invalid" ? "Invalid password reset link." : null;

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>Reset Password for Yona</h1>
      {message ? <p className="lede">{message}</p> : null}
      <form
        action={appHref(runtimeConfig, "/resetPassword")}
        className="runtime-grid"
        method="post"
      >
        <input name="hashString" type="hidden" value={hashString} />
        <label>
          <span>Password</span>
          <input name="password" type="password" />
        </label>
        <label>
          <span>Retype password</span>
          <input name="retypedPassword" type="password" />
        </label>
        <button type="submit">Confirm</button>
      </form>
    </main>
  );
}

export function VerifyUserPage({
  invalid,
  loginId,
  runtimeConfig,
}: {
  invalid?: boolean;
  loginId: string;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Auth</p>
      <h1>{invalid ? "Invalid verification" : "Verified User"}</h1>
      <p>{loginId}</p>
      <p className="tag-line">
        {invalid ? "Invalid verification" : "User is verified. Try logging in."}
      </p>
      <a href={appHref(runtimeConfig, "/users/loginform")}>Login</a>
    </main>
  );
}
