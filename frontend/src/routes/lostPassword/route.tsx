import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { requestPasswordReset } from "../../auth-workspace-client";
import { prefixBasePath } from "../../runtime-config";
import { LostPasswordPage } from "../-auth-views";
import { useCurrentHref, useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/lostPassword")({
  component: LostPasswordRouteComponent,
});

function LostPasswordRouteComponent() {
  const { csrfToken, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  const currentHref = useCurrentHref();
  useDocumentTitle("site.resetPasswordEmail.title");
  return (
    <LostPasswordPage
      csrfToken={csrfToken}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      onRequestReset={async (input) => {
        try {
          const result = await requestPasswordReset(runtimeConfig, csrfToken, input);
          void navigate({ href: prefixBasePath(runtimeConfig.basePath, result.redirectPath) });
        } catch {
          void navigate({
            href: prefixBasePath(runtimeConfig.basePath, "/lostPassword?error=invalid"),
          });
        }
      }}
    />
  );
}
