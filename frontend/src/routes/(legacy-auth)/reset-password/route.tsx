import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../../app-runtime-context";
import { RedirectPage } from "../../-shared";

export const Route = createFileRoute("/(legacy-auth)/reset-password")({
  component: ResetPasswordAliasRouteComponent,
});

function ResetPasswordAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  return (
    <RedirectPage basePath={runtimeConfig.basePath} preserveSearch={true} to="/resetPassword" />
  );
}
