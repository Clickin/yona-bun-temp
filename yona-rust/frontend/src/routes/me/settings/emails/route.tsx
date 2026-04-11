import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../../../app-runtime-context";
import { RedirectPage } from "../../../-shared";

export const Route = createFileRoute("/me/settings/emails")({
  component: MeSettingsEmailsAliasRouteComponent,
});

function MeSettingsEmailsAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  return <RedirectPage basePath={runtimeConfig.basePath} to="/user/editform/emails" />;
}
