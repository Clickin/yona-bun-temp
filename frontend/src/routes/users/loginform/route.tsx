import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RestApiError } from "../../../api/rest-client";
import { signInWithPassword } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { LoginPage, resolveAuthRedirectPath, resolvePostAuthHref } from "../../-auth-views";
import { navigateToAppHref, useCurrentHref, useDocumentTitle } from "../../-shared";

export const Route = createFileRoute("/users/loginform")({
  component: LoginRouteComponent,
});

function legacyLoginFailureMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "user.login.failed.network";
  }
  if (error instanceof RestApiError) {
    if (error.code !== "http_error" && error.message) {
      return error.message;
    }
    if (error.status >= 400 && error.status < 500) {
      return "user.login.failed.client";
    }
    if (error.status >= 500 && error.status < 600) {
      return "user.login.failed.server";
    }
    return "user.login.failed";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "user.login.failed";
}

function LoginRouteComponent() {
  const {
    authUiCapabilities,
    bootstrapping,
    csrfToken,
    refreshWorkspace,
    runtimeConfig,
    setCurrentSession,
    setErrorMessage,
  } = useAppRuntime();
  const [pending, setPending] = React.useState(false);
  const currentHref = useCurrentHref();
  useDocumentTitle("title.login");

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
      </main>
    );
  }

  return (
    <LoginPage
      authUiCapabilities={authUiCapabilities}
      csrfToken={csrfToken}
      pending={pending}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      onSignIn={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const session = await signInWithPassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          await refreshWorkspace(session);
          const searchParams =
            typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
          const nextHref = resolvePostAuthHref(
            resolveAuthRedirectPath(searchParams),
            session.defaultLandingPath,
          );
          navigateToAppHref(runtimeConfig.basePath, nextHref);
        } catch (error) {
          setErrorMessage(legacyLoginFailureMessage(error));
        } finally {
          setPending(false);
        }
      }}
    />
  );
}
