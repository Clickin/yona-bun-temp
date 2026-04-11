import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { ResetPasswordPage } from "../-auth-views";
import { useCurrentHref } from "../-shared";

export const Route = createFileRoute("/resetPassword")({
  component: ResetPasswordRouteComponent,
});

function ResetPasswordRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  return <ResetPasswordPage routeHref={currentHref} runtimeConfig={runtimeConfig} />;
}
