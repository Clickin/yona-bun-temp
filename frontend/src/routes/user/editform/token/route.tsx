import { createFileRoute } from "@tanstack/react-router";
import { resetApiToken } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { WorkspaceSettingsPage } from "../../../-workspace-settings-view";
import { useCurrentHref, useRequireAuthenticatedRoute } from "../../../-shared";

export const Route = createFileRoute("/user/editform/token")({
  component: EditTokenRouteComponent,
});

function EditTokenRouteComponent() {
  const {
    bootstrapping,
    csrfToken,
    messages,
    runtimeConfig,
    workspaceOverview,
    setErrorMessage,
    syncWorkspaceFromOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/editform/token");
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
      renderShell={false}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      section="token"
      workspaceOverview={workspaceOverview}
      onResetApiToken={async () => {
        try {
          const overview = await resetApiToken(runtimeConfig, csrfToken);
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
    />
  );
}
