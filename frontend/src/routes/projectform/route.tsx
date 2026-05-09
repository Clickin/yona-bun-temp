import { createFileRoute } from "@tanstack/react-router";
import { createProject } from "../../auth-workspace-client";
import { useAppRuntime } from "../../app-runtime-context";
import { ProjectNewPage } from "../-project-views";
import { navigateToAppHref, useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/projectform")({
  component: ProjectNewRouteComponent,
});

function ProjectNewRouteComponent() {
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/projectform");

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  return (
    <ProjectNewPage
      onCreateProject={async (input) => {
        try {
          const detail = await createProject(runtimeConfig, csrfToken, input);
          navigateToAppHref(runtimeConfig.basePath, `/${detail.ownerName}/${detail.projectName}`);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Create project failed.");
        }
      }}
    />
  );
}
