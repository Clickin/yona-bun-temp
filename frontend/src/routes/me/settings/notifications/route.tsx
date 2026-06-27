import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useAppRuntime } from "../../../../app-runtime-context";
import { RedirectPage } from "../../../-shared";

export const Route = createFileRoute("/me/settings/notifications")({
  component: MeSettingsNotificationsAliasRouteComponent,
});

function MeSettingsNotificationsAliasRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useRouterState({ select: (state) => state.location.href });
  return (
    <RedirectPage
      basePath={runtimeConfig.basePath}
      currentHref={currentHref}
      preserveHash={true}
      to="/user/editform/notifications"
    />
  );
}
