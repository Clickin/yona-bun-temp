import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { completePasswordReset } from "../../auth-workspace-client";
import { ResetPasswordPage } from "../-auth-views";
import { navigateToAppHref, useCurrentHref, useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/resetPassword")({
  component: ResetPasswordRouteComponent,
});

function ResetPasswordRouteComponent() {
  const { csrfToken, runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  useDocumentTitle("title.resetPassword");
  return (
    <ResetPasswordPage
      csrfToken={csrfToken}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      onResetPassword={async (input) => {
        try {
          const result = await completePasswordReset(runtimeConfig, csrfToken, input);
          navigateToAppHref(runtimeConfig.basePath, result.redirectPath);
        } catch {
          const suffix = input.hashString ? `&s=${encodeURIComponent(input.hashString)}` : "";
          navigateToAppHref(runtimeConfig.basePath, `/resetPassword?error=invalid${suffix}`);
        }
      }}
    />
  );
}
