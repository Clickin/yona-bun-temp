import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { createProject } from "../../auth-workspace-client";
import {
  readProjectCreateFormOptionsRest,
  type ProjectCreateFormOptionsResponse,
} from "../../api/org-project";
import { useAppRuntime } from "../../app-runtime-context";
import { ProjectNewPage } from "../-project-views";
import { navigateToAppHref, useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/projectform")({
  component: ProjectNewRouteComponent,
});

function ProjectNewRouteComponent() {
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/projectform");
  const [formOptions, setFormOptions] = React.useState<ProjectCreateFormOptionsResponse | null>(
    null,
  );

  React.useEffect(() => {
    if (bootstrapping || !canRender) {
      return;
    }
    const owner = new URLSearchParams(window.location.search).get("owner") ?? undefined;
    let cancelled = false;
    void readProjectCreateFormOptionsRest(runtimeConfig, { owner })
      .then((options) => {
        if (!cancelled) {
          setFormOptions(options);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Read project form options failed.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bootstrapping, canRender, runtimeConfig, setErrorMessage]);

  if (bootstrapping || !canRender || !formOptions) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  return (
    <ProjectNewPage
      defaultProjectMenus={runtimeConfig.projectDefaultMenus}
      defaultProjectScope={runtimeConfig.projectDefaultScope}
      ownerOptions={formOptions.ownerOptions}
      onCreateProject={async (input) => {
        try {
          const detail = await createProject(runtimeConfig, csrfToken, input);
          navigateToAppHref(runtimeConfig.basePath, `/${detail.ownerName}/${detail.projectName}`);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Create project failed.");
        }
      }}
      selectedOwnerName={formOptions.selectedOwnerName}
    />
  );
}
