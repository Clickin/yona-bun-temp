import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useAppRuntime } from "../../../app-runtime-context";
import { RedirectPage } from "../../-shared";

export const Route = createFileRoute("/(legacy-auth)/reset-password")({
  component: ResetPasswordAliasRouteComponent,
});

function ResetPasswordAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useRouterState({ select: (state) => state.location.href });
  return (
    <RedirectPage
      basePath={runtimeConfig.basePath}
      currentHref={currentHref}
      preserveSearch={true}
      to="/resetPassword"
    />
  );
}
