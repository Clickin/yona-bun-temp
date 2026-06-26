import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useAppRuntime } from "../../../app-runtime-context";
import {
  type WorkspaceSettingsSection,
  WorkspaceSettingsShell,
} from "../../-workspace-settings-view";

export const Route = createFileRoute("/user/editform")({
  component: EditFormLayoutRouteComponent,
});

function EditFormLayoutRouteComponent() {
  const { messages, runtimeConfig } = useAppRuntime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <WorkspaceSettingsShell
      messages={messages}
      runtimeConfig={runtimeConfig}
      section={workspaceSettingsSectionFromPath(pathname)}
    >
      <Outlet />
    </WorkspaceSettingsShell>
  );
}

function workspaceSettingsSectionFromPath(pathname: string): WorkspaceSettingsSection {
  if (pathname.endsWith("/password")) {
    return "password";
  }
  if (pathname.endsWith("/notifications")) {
    return "notifications";
  }
  if (pathname.endsWith("/emails")) {
    return "emails";
  }
  if (pathname.endsWith("/token")) {
    return "token";
  }
  return "profile";
}
