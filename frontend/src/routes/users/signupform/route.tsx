import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RestApiError } from "../../../api/rest-client";
import { registerWithPassword } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { prefixBasePath } from "../../../runtime-config";
import { RegisterPage } from "../../-auth-views";
import { useDocumentTitle } from "../../-shared";

export const Route = createFileRoute("/users/signupform")({
  component: RegisterRouteComponent,
});

function legacySignupFailureMessage(error: unknown): string {
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
    return "user.enroll.failed";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "user.enroll.failed";
}

function RegisterRouteComponent() {
  const {
    authUiCapabilities,
    bootstrapping,
    csrfToken,
    messages,
    refreshWorkspace,
    runtimeConfig,
    setCurrentSession,
    setErrorMessage,
  } = useAppRuntime();
  const [pending, setPending] = React.useState(false);
  const navigate = useNavigate();
  useDocumentTitle("title.signup");

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
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
            void navigate({
              href: prefixBasePath(runtimeConfig.basePath, session.defaultLandingPath || "/me"),
            });
            return;
          }
          if (authUiCapabilities?.signupRequireConfirm) {
            void navigate({ href: prefixBasePath(runtimeConfig.basePath, "/?signup=requested") });
            return;
          }
          if (authUiCapabilities?.emailVerificationEnabled) {
            void navigate({ href: prefixBasePath(runtimeConfig.basePath, "/?verify=sent") });
            return;
          }
        } catch (error) {
          setErrorMessage(legacySignupFailureMessage(error));
        } finally {
          setPending(false);
        }
      }}
    />
  );
}
