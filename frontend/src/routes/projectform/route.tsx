import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { createProject } from "../../auth-workspace-client";
import {
  readProjectCreateFormOptionsRest,
  type ProjectCreateFormOptionsResponse,
} from "../../api/org-project";
import { useAppRuntime } from "../../app-runtime-context";
import { ProjectNewPage } from "../-project-views";
import { BadRequestPage, navigateToAppHref, useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/projectform")({
  component: ProjectNewRouteComponent,
});

function ProjectNewRouteComponent() {
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/projectform");
  const [formOptions, setFormOptions] = React.useState<ProjectCreateFormOptionsResponse | null>(
    null,
  );
  const [readFailed, setReadFailed] = React.useState(false);

  React.useEffect(() => {
    if (bootstrapping || !canRender) {
      return;
    }
    const owner = new URLSearchParams(window.location.search).get("owner") ?? undefined;
    let cancelled = false;
    setReadFailed(false);
    void readProjectCreateFormOptionsRest(runtimeConfig, { owner })
      .then((options) => {
        if (!cancelled) {
          setFormOptions(options);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReadFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bootstrapping, canRender, runtimeConfig, setErrorMessage]);

  if (bootstrapping || !canRender || !formOptions) {
    if (readFailed) {
      return <BadRequestPage href="/projectform" />;
    }
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
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
          setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
        }
      }}
      selectedOwnerName={formOptions.selectedOwnerName}
    />
  );
}
