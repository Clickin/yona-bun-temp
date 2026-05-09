import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { signOut } from "../../auth-workspace-client";
import { WorkspacePage } from "../-workspace-views";
import { navigateToAppHref, useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/me")({
  component: MeRouteComponent,
});

function MeRouteComponent() {
  const {
    bootstrapping,
    csrfToken,
    runtimeConfig,
    workspaceOverview,
    setCurrentSession,
    setWorkspaceOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/me");

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  return (
    <WorkspacePage
      runtimeConfig={runtimeConfig}
      workspaceOverview={workspaceOverview}
      onSignOut={async () => {
        await signOut(runtimeConfig, csrfToken);
        setCurrentSession(null);
        setWorkspaceOverview(null);
        navigateToAppHref(runtimeConfig.basePath, "/users/loginform");
      }}
    />
  );
}
