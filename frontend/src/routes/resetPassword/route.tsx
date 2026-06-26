import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { completePasswordReset } from "../../auth-workspace-client";
import { prefixBasePath } from "../../runtime-config";
import { ResetPasswordPage } from "../-auth-views";
import { useCurrentHref, useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/resetPassword")({
  component: ResetPasswordRouteComponent,
});

function ResetPasswordRouteComponent() {
  const { csrfToken, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
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
          void navigate({ href: prefixBasePath(runtimeConfig.basePath, result.redirectPath) });
        } catch {
          const suffix = input.hashString ? `&s=${encodeURIComponent(input.hashString)}` : "";
          void navigate({
            href: prefixBasePath(runtimeConfig.basePath, `/resetPassword?error=invalid${suffix}`),
          });
        }
      }}
    />
  );
}
