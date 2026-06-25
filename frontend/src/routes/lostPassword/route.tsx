import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { requestPasswordReset } from "../../auth-workspace-client";
import { LostPasswordPage } from "../-auth-views";
import { navigateToAppHref, useCurrentHref } from "../-shared";

export const Route = createFileRoute("/lostPassword")({
  component: LostPasswordRouteComponent,
});

function LostPasswordRouteComponent() {
  const { csrfToken, runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  return (
    <LostPasswordPage
      csrfToken={csrfToken}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      onRequestReset={async (input) => {
        try {
          const result = await requestPasswordReset(runtimeConfig, csrfToken, input);
          navigateToAppHref(runtimeConfig.basePath, result.redirectPath);
        } catch {
          navigateToAppHref(runtimeConfig.basePath, "/lostPassword?error=invalid");
        }
      }}
    />
  );
}
