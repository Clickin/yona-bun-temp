import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { listProjects } from "../../auth-workspace-client";
import { useAppRuntime } from "../../app-runtime-context";
import { toProjectDirectoryView } from "../../app-view-models";
import { ProjectDirectoryPage } from "../-directory-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useCurrentHref,
  useDocumentTitle,
  type RouteFailureKind,
} from "../-shared";

export const Route = createFileRoute("/projects")({
  component: ProjectsRouteComponent,
});

function ProjectsRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  const navigate = useNavigate();
  useDocumentTitle("title.projectList");
  const [projectDirectory, setProjectDirectory] = React.useState<ReturnType<
    typeof toProjectDirectoryView
  > | null>(null);
  const [failureKind, setFailureKind] = React.useState<null | RouteFailureKind>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const projects = await listProjects(runtimeConfig);
        if (!cancelled) {
          setFailureKind(null);
          setProjectDirectory(toProjectDirectoryView(projects));
        }
      } catch (error) {
        if (!cancelled) {
          setFailureKind(classifyConnectFailure(error));
          setProjectDirectory(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runtimeConfig]);

  if (failureKind === "forbidden") {
    return <ForbiddenPage href={currentHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={currentHref} />;
  }

  return (
    <ProjectDirectoryPage
      directory={projectDirectory}
      href={currentHref}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      runtimeConfig={runtimeConfig}
    />
  );
}
