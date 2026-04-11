import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { RedirectPage } from "../-shared";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordAliasRouteComponent,
});

function ForgotPasswordAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  return <RedirectPage basePath={runtimeConfig.basePath} to="/lostPassword" />;
}
