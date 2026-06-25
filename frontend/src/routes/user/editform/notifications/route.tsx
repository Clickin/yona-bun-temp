import { createFileRoute } from "@tanstack/react-router";
import { toggleWorkspaceNotification } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { WorkspaceSettingsPage } from "../../../-workspace-settings-view";
import { useCurrentHref, useRequireAuthenticatedRoute } from "../../../-shared";

export const Route = createFileRoute("/user/editform/notifications")({
  component: EditNotificationsRouteComponent,
});

function EditNotificationsRouteComponent() {
  const {
    bootstrapping,
    csrfToken,
    messages,
    runtimeConfig,
    workspaceOverview,
    setErrorMessage,
    syncWorkspaceFromOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/editform/notifications");
  const currentHref = useCurrentHref();

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return (
    <WorkspaceSettingsPage
      csrfToken={csrfToken}
      messages={messages}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      section="notifications"
      workspaceOverview={workspaceOverview}
      onToggleWorkspaceNotification={async (projectId, eventType) => {
        try {
          const overview = await toggleWorkspaceNotification(
            runtimeConfig,
            csrfToken,
            projectId,
            eventType,
          );
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.failedTo", {
                  args: [
                    messages("userinfo.changeNotifications", {
                      fallback: "userinfo.changeNotifications",
                    }),
                    "",
                    "",
                  ],
                  fallback: "error.failedTo",
                }),
          );
        }
      }}
    />
  );
}
