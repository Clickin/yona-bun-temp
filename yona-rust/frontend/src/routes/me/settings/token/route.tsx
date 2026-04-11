import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../../../app-runtime-context";
import { RedirectPage } from "../../../-shared";

export const Route = createFileRoute("/me/settings/token")({
  component: MeSettingsTokenAliasRouteComponent,
});

function MeSettingsTokenAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  return <RedirectPage basePath={runtimeConfig.basePath} to="/user/editform/token" />;
}
