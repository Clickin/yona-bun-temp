import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  readProjectCreateFormOptionsRest,
  type ProjectCreateFormOptionsResponse,
} from "../../api/org-project";
import { useAppRuntime } from "../../app-runtime-context";
import { ProjectImportPage } from "../-project-views";
import { useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/_import")({
  component: ProjectImportRouteComponent,
});

function ProjectImportRouteComponent() {
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/_import");
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
            error instanceof Error ? error.message : "Read project import options failed.",
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
    <ProjectImportPage
      defaultProjectMenus={runtimeConfig.projectDefaultMenus}
      defaultProjectScope={runtimeConfig.projectDefaultScope}
      ownerOptions={formOptions.ownerOptions}
      onImportProject={() => {
        setErrorMessage("Project import mutation is deferred.");
      }}
      selectedOwnerName={formOptions.selectedOwnerName}
    />
  );
}
