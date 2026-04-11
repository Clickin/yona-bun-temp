import { createFileRoute } from "@tanstack/react-router";
import { updateProfile } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { WorkspaceSettingsPage } from "../../-workspace-settings-view";
import { navigateToAppHref, useCurrentHref, useRequireAuthenticatedRoute } from "../../-shared";

export const Route = createFileRoute("/user/editform/")({
  component: EditProfileRouteComponent,
});

function EditProfileRouteComponent() {
  const { bootstrapping, csrfToken, runtimeConfig, workspaceOverview, setErrorMessage, syncWorkspaceFromOverview } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/editform");
  const currentHref = useCurrentHref();

  if (bootstrapping || !canRender) {
    return <main className="app-shell"><h1>Loading...</h1></main>;
  }

  return (
    <WorkspaceSettingsPage
      csrfToken={csrfToken}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      section="profile"
      workspaceOverview={workspaceOverview}
      onUpdateProfile={async (input) => {
        try {
          const overview = await updateProfile(runtimeConfig, csrfToken, input);
          await syncWorkspaceFromOverview(overview);
          navigateToAppHref(runtimeConfig.basePath, "/me");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Update profile failed.");
        }
      }}
    />
  );
}
