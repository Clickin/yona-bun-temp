import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { signInWithPassword } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { LoginPage, resolveAuthRedirectPath, resolvePostAuthHref } from "../../-auth-views";
import { navigateToAppHref, useCurrentHref, useDocumentTitle } from "../../-shared";

export const Route = createFileRoute("/users/loginform")({
  component: LoginRouteComponent,
});

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
  useDocumentTitle("Login");

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
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
          setErrorMessage(error instanceof Error ? error.message : "Sign in failed.");
        } finally {
          setPending(false);
        }
      }}
    />
  );
}
