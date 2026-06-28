import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RestApiError } from "../../api/rest-client";
import { setupSecretAdminRest } from "../../api/auth";
import { useAppRuntime } from "../../app-runtime-context";
import { prefixBasePath } from "../../runtime-config";
import { NotFoundPage, useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/secret")({
  component: SecretAdminSetupRouteComponent,
});

function SecretAdminSetupRouteComponent() {
  const { authUiCapabilities, bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } =
    useAppRuntime();
  const navigate = useNavigate();
  const [formState, setFormState] = React.useState({
    emailAddress: "",
    name: "",
    password: "",
    retypedPassword: "",
  });
  const [pending, setPending] = React.useState(false);
  const siteName = runtimeConfig.siteName || "Yona";
  const welcomeTitle = messages("app.welcome", { args: [siteName], fallback: "app.welcome" });
  useDocumentTitle(welcomeTitle);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  if (authUiCapabilities && authUiCapabilities.secretSetupRequired === false) {
    return <NotFoundPage href="/" />;
  }

  return (
    <main className="secret-page">
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap">
              <a className="logo" href={prefixBasePath(runtimeConfig.basePath, "/")}>
                <span>{siteName}</span>
              </a>
              <h3>{messages("app.welcome", { args: [siteName], fallback: "app.welcome" })}</h3>
              <div className="alert alert-block secret-box">
                <h4>
                  {messages("app.welcome.warning.title", { fallback: "app.welcome.warning.title" })}
                </h4>
                {messages("app.welcome.warning.desc", { fallback: "app.welcome.warning.desc" })}
              </div>
            </div>
            <div className="signup-form-wrap frm-wrap">
              <form
                className="input-append"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setPending(true);
                  setErrorMessage(null);
                  try {
                    const response = await setupSecretAdminRest(
                      runtimeConfig,
                      csrfToken,
                      formState,
                    );
                    void navigate({
                      href: prefixBasePath(
                        runtimeConfig.basePath,
                        response.restartPath || "/restart",
                      ),
                    });
                  } catch (error) {
                    setErrorMessage(secretSetupFailureMessage(error));
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <dl>
                  <dt>
                    <label htmlFor="loginId">
                      {messages("user.signupId", { fallback: "user.signupId" })}
                    </label>
                  </dt>
                  <dd>
                    <input
                      autoComplete="off"
                      className="text password"
                      id="loginId"
                      name="loginId"
                      placeholder=""
                      readOnly
                      type="text"
                      value="admin"
                    />
                  </dd>
                  <dt>
                    <label htmlFor="uname">
                      {messages("user.name", { fallback: "user.name" })}
                    </label>
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
                    <label htmlFor="email">
                      {messages("user.email", { fallback: "user.email" })}
                    </label>
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
                      type="text"
                      value={formState.emailAddress}
                    />
                  </dd>
                  <dt>
                    <label htmlFor="password">
                      {messages("user.password", { fallback: "user.password" })}
                    </label>
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
                    <label htmlFor="retypedPassword">
                      {messages("validation.retypePassword", {
                        fallback: "validation.retypePassword",
                      })}
                    </label>
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
                  <button className="ybtn ybtn-success" disabled={pending} type="submit">
                    {messages("app.welcome.submit", { fallback: "app.welcome.submit" })}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Powered by <strong>{siteName}</strong>
          </span>
        </div>
      </footer>
    </main>
  );
}

function secretSetupFailureMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "user.enroll.failed.network";
  }
  if (error instanceof RestApiError) {
    if (error.code !== "http_error" && error.message) {
      return error.message;
    }
    if (error.status >= 400 && error.status < 500) {
      return "user.enroll.failed.client";
    }
    if (error.status >= 500 && error.status < 600) {
      return "user.enroll.failed.server";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "user.enroll.failed";
}
