import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RestApiError } from "../../../api/rest-client";
import { signInWithPassword } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { prefixBasePath } from "../../../runtime-config";
import { LoginPage, resolveAuthRedirectPath, resolvePostAuthHref } from "../../-auth-views";
import { useCurrentHref, useDocumentTitle } from "../../-shared";

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
    messages,
    refreshWorkspace,
    runtimeConfig,
    setCurrentSession,
    setErrorMessage,
  } = useAppRuntime();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentHref = useCurrentHref();
  const signInMutation = useMutation({
    mutationFn: (input: { identifier: string; password: string; rememberMe: boolean }) =>
      signInWithPassword(runtimeConfig, csrfToken, input),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
  useDocumentTitle("title.login");

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return (
    <LoginPage
      authUiCapabilities={authUiCapabilities}
      csrfToken={csrfToken}
      pending={signInMutation.isPending}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      onSignIn={async (input) => {
        setErrorMessage(null);
        try {
          const session = await signInMutation.mutateAsync(input);
          setCurrentSession(session);
          await refreshWorkspace(session);
          const searchParams = new URL(currentHref, "http://localhost").searchParams;
          const nextHref = resolvePostAuthHref(
            resolveAuthRedirectPath(searchParams),
            session.defaultLandingPath,
          );
          void navigate({ href: prefixBasePath(runtimeConfig.basePath, nextHref) });
        } catch (error) {
          setErrorMessage(legacyLoginFailureMessage(error));
        }
      }}
    />
  );
}
