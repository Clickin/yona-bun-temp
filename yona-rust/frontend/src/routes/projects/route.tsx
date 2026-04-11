import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listProjects } from "../../auth-workspace-client";
import { useAppRuntime } from "../../app-runtime-context";
import { toProjectDirectoryView } from "../../app-view-models";
import { ProjectDirectoryPage } from "../-directory-views";
import { useCurrentHref, useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/projects")({
  component: ProjectsRouteComponent,
});

function ProjectsRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  useDocumentTitle("Project List");
  const [projectDirectory, setProjectDirectory] = React.useState<ReturnType<typeof toProjectDirectoryView> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const projects = await listProjects(runtimeConfig);
      if (!cancelled) {
        setProjectDirectory(toProjectDirectoryView(projects));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runtimeConfig]);

  return (
    <ProjectDirectoryPage
      directory={projectDirectory}
      href={currentHref}
      runtimeConfig={runtimeConfig}
    />
  );
}
