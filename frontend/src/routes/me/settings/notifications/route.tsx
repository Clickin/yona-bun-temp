import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../../../app-runtime-context";
import { RedirectPage } from "../../../-shared";

export const Route = createFileRoute("/me/settings/notifications")({
  component: MeSettingsNotificationsAliasRouteComponent,
});

function MeSettingsNotificationsAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  return (
    <RedirectPage
      basePath={runtimeConfig.basePath}
      preserveHash={true}
      to="/user/editform/notifications"
    />
  );
}
