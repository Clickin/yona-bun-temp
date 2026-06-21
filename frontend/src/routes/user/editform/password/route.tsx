import { createFileRoute } from "@tanstack/react-router";
import { changePassword } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { WorkspaceSettingsPage } from "../../../-workspace-settings-view";
import {
  navigateToAppHref,
  useCurrentHref,
  useDocumentTitle,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/user/editform/password")({
  component: EditPasswordRouteComponent,
});

function EditPasswordRouteComponent() {
  const {
    bootstrapping,
    csrfToken,
    messages,
    runtimeConfig,
    workspaceOverview,
    setCurrentSession,
    setErrorMessage,
    setWorkspaceOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/editform/password");
  const currentHref = useCurrentHref();
  useDocumentTitle("userinfo.accountSetting");

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
      section="password"
      workspaceOverview={workspaceOverview}
      onChangePassword={async (input) => {
        try {
          const session = await changePassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          setWorkspaceOverview(null);
          navigateToAppHref(runtimeConfig.basePath, "/users/loginform");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
        }
      }}
    />
  );
}
