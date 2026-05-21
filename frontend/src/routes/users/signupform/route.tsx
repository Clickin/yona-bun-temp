import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { registerWithPassword } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { RegisterPage } from "../../-auth-views";
import { navigateToAppHref, useDocumentTitle } from "../../-shared";

export const Route = createFileRoute("/users/signupform")({
  component: RegisterRouteComponent,
});

function RegisterRouteComponent() {
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
  useDocumentTitle("Sign Up");

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  return (
    <RegisterPage
      authUiCapabilities={authUiCapabilities}
      csrfToken={csrfToken}
      pending={pending}
      runtimeConfig={runtimeConfig}
      onRegister={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const session = await registerWithPassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          if (!session.isAnonymous) {
            await refreshWorkspace(session);
            navigateToAppHref(runtimeConfig.basePath, session.defaultLandingPath || "/me");
            return;
          }
          if (authUiCapabilities?.signupRequireConfirm) {
            navigateToAppHref(runtimeConfig.basePath, "/users/loginform?signup=requested");
            return;
          }
          if (authUiCapabilities?.emailVerificationEnabled) {
            navigateToAppHref(runtimeConfig.basePath, "/users/loginform?verify=sent");
            return;
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Register failed.");
        } finally {
          setPending(false);
        }
      }}
    />
  );
}
