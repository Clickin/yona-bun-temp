import { createFileRoute } from "@tanstack/react-router";
import {
  addWorkspaceEmail,
  deleteWorkspaceEmail,
  sendWorkspaceEmailValidation,
  setMainWorkspaceEmail,
} from "@/auth-workspace-client";
import { useAppRuntime } from "@/app-runtime-context";
import { WorkspaceSettingsPage } from "@/routes/-workspace-settings-view";
import { useCurrentHref, useRequireAuthenticatedRoute } from "@/routes/-shared";

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
      section="emails"
      workspaceOverview={workspaceOverview}
      onAddWorkspaceEmail={async (email) => {
        try {
          const overview = await addWorkspaceEmail(runtimeConfig, csrfToken, email);
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onDeleteWorkspaceEmail={async (id) => {
        try {
          const overview = await deleteWorkspaceEmail(runtimeConfig, csrfToken, id);
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onSendWorkspaceEmailValidation={async (id) => {
        try {
          const overview = await sendWorkspaceEmailValidation(runtimeConfig, csrfToken, id);
          await syncWorkspaceFromOverview(overview);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onSetMainWorkspaceEmail={async (id) => {
        try {
          const overview = await setMainWorkspaceEmail(runtimeConfig, csrfToken, id);
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
