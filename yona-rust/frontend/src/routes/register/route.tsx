import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { RedirectPage } from "../-shared";

export const Route = createFileRoute("/register")({
  component: RegisterAliasRouteComponent,
});

function RegisterAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  return <RedirectPage basePath={runtimeConfig.basePath} to="/users/signupform" />;
}
