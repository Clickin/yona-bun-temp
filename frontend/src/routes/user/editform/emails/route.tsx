import { createFileRoute } from "@tanstack/react-router";
import {
  addWorkspaceEmail,
  deleteWorkspaceEmail,
  setMainWorkspaceEmail,
} from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { WorkspaceSettingsPage } from "../../../-workspace-settings-view";
import { useCurrentHref, useRequireAuthenticatedRoute } from "../../../-shared";

export const Route = createFileRoute("/user/editform/emails")({
  component: EditEmailsRouteComponent,
});

function EditEmailsRouteComponent() {
  const {
    bootstrapping,
    csrfToken,
    messages,
    runtimeConfig,
    workspaceOverview,
    setErrorMessage,
    syncWorkspaceFromOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/editform/emails");
  const currentHref = useCurrentHref();

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
      </main>
    );
  }

  return (
    <WorkspaceSettingsPage
      csrfToken={csrfToken}
      messages={messages}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      section="emails"
      workspaceOverview={workspaceOverview}
      onAddWorkspaceEmail={async (email) => {
        try {
          const overview = await addWorkspaceEmail(runtimeConfig, csrfToken, email);
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
        }
      }}
      onDeleteWorkspaceEmail={async (id) => {
        try {
          const overview = await deleteWorkspaceEmail(runtimeConfig, csrfToken, id);
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
        }
      }}
      onSetMainWorkspaceEmail={async (id) => {
        try {
          const overview = await setMainWorkspaceEmail(runtimeConfig, csrfToken, id);
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
        }
      }}
    />
  );
}
